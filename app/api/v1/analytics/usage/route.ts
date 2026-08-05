import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { usageDailyRollups, usageLogs, buckets, objects } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { runUsageAggregation } from "@/lib/jobs/aggregate-core";
import { errorResponse } from "@/lib/api/errors";
import { eq, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/analytics/usage
 * Returns time-series usage rollups and object access analytics shaped for rich dashboard charting.
 */
export async function GET(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized dashboard analytics session");
  }

  try {
    // Ensure rollups are up-to-the-second accurate even between hourly BullMQ cron runs
    await runUsageAggregation().catch((err) => {
      console.warn("[Analytics] On-demand usage aggregation warning:", err);
    });

    const url = new URL(request.url);
    const granularity = url.searchParams.get("granularity") || "day";

    // Query daily rollups for user
    const rollups = await db.query.usageDailyRollups.findMany({
      where: eq(usageDailyRollups.userId, user.id),
      orderBy: [asc(usageDailyRollups.date)],
    });

    // Query real current storage across all user's buckets
    const userBuckets = await db.query.buckets.findMany({
      where: eq(buckets.userId, user.id),
    });

    const bucketIds = userBuckets.map((b) => b.id);
    const allUserObjects: Array<{ id: string; key: string; sizeBytes: number; bucketId: string }> = [];

    for (const bId of bucketIds) {
      const objs = await db.query.objects.findMany({
        where: eq(objects.bucketId, bId),
      });
      allUserObjects.push(...objs);
    }

    const currentTotalStorage = allUserObjects.reduce((sum, o) => sum + (o.sizeBytes || 0), 0);

    // Build time series for last 7 days (or actual rollup dates)
    const dateMap = new Map<string, {
      date: string;
      storageUsed: number;
      upload: number;
      download: number;
      delete: number;
      list: number;
      bandwidthBytes: number;
    }>();

    // Initialize recent 7 days with 0s for continuous chart visualization
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      dateMap.set(ds, {
        date: ds,
        storageUsed: currentTotalStorage, // current snapshot base
        upload: 0,
        download: 0,
        delete: 0,
        list: 0,
        bandwidthBytes: 0,
      });
    }

    // Merge actual aggregated DB rollup records
    for (const r of rollups) {
      const existing = dateMap.get(r.date) || {
        date: r.date,
        storageUsed: currentTotalStorage,
        upload: 0,
        download: 0,
        delete: 0,
        list: 0,
        bandwidthBytes: 0,
      };

      existing.upload += r.uploadCount;
      existing.download += r.downloadCount;
      existing.delete += r.deleteCount;
      existing.list += r.listCount;
      existing.bandwidthBytes += r.bytesUploaded + r.bytesDownloaded;
      dateMap.set(r.date, existing);
    }

    // Convert map to sorted series array
    const sortedDates = Array.from(dateMap.keys()).sort();
    const series = sortedDates.map((d) => {
      const val = dateMap.get(d)!;
      // Friendly label for X-axis e.g. "Aug 04" or "YYYY-MM-DD"
      const parsedDate = new Date(d + "T00:00:00");
      const shortLabel = parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        ...val,
        label: shortLabel,
      };
    });

    // Group Top Accessed Objects from granular usage_logs
    const userLogs = await db.query.usageLogs.findMany({
      where: eq(usageLogs.userId, user.id),
      orderBy: [desc(usageLogs.createdAt)],
    });

    const objectHitMap = new Map<string, { key: string; requests: number; bytes: number; lastAccessed: string }>();

    for (const l of userLogs) {
      if (l.objectKey) {
        const item = objectHitMap.get(l.objectKey) || {
          key: l.objectKey,
          requests: 0,
          bytes: 0,
          lastAccessed: l.createdAt.toISOString(),
        };
        item.requests++;
        item.bytes += l.bytesTransferred;
        if (new Date(l.createdAt) > new Date(item.lastAccessed)) {
          item.lastAccessed = l.createdAt.toISOString();
        }
        objectHitMap.set(l.objectKey, item);
      }
    }

    // Backfill any real files currently in DB objects so user always sees real uploaded object stats
    for (const obj of allUserObjects) {
      if (!objectHitMap.has(obj.key)) {
        objectHitMap.set(obj.key, {
          key: obj.key,
          requests: 1, // Baseline creation put hit
          bytes: obj.sizeBytes,
          lastAccessed: new Date().toISOString(),
        });
      }
    }

    const topObjects = Array.from(objectHitMap.values())
      .sort((a, b) => b.requests - a.requests || b.bytes - a.bytes)
      .slice(0, 10);

    const totalBandwidthBytes = series.reduce((sum, s) => sum + s.bandwidthBytes, 0);
    const totalRequests = series.reduce((sum, s) => sum + (s.upload + s.download + s.delete + s.list), 0);

    return NextResponse.json({
      granularity,
      summary: {
        totalStorageBytes: currentTotalStorage,
        totalBandwidthBytes,
        totalRequests,
        objectCount: allUserObjects.length,
      },
      series,
      topObjects,
    });
  } catch (err) {
    console.error("[UsageAnalytics] Error:", err);
    return errorResponse("InternalError", "Failed to compile usage analytics metrics");
  }
}
