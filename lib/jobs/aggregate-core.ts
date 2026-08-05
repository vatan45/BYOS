import { db } from "@/lib/db/client";
import { usageLogs, usageDailyRollups } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Core usage log aggregation logic.
 * Rolls up granular usage_logs into daily summaries in usage_daily_rollups.
 * Keeps analytics fast by allowing dashboard queries on indexed daily summary rows.
 * Separated from BullMQ queue infrastructure so Next.js API endpoints can import cleanly without web-bundle warnings.
 */
export async function runUsageAggregation(): Promise<{
  rowsProcessed: number;
  rollupsUpdated: number;
}> {
  const allLogs = await db.query.usageLogs.findMany();
  if (allLogs.length === 0) {
    return { rowsProcessed: 0, rollupsUpdated: 0 };
  }

  // Group logs by key: `${userId}___${bucketId || ''}___${dateStr}`
  const groupMap = new Map<string, {
    userId: string;
    bucketId: string | null;
    date: string;
    uploadCount: number;
    downloadCount: number;
    deleteCount: number;
    listCount: number;
    bytesUploaded: number;
    bytesDownloaded: number;
    requestCount: number;
  }>();

  for (const log of allLogs) {
    const dateStr = new Date(log.createdAt).toISOString().slice(0, 10);
    const key = `${log.userId}___${log.bucketId || ""}___${dateStr}`;

    let current = groupMap.get(key);
    if (!current) {
      current = {
        userId: log.userId,
        bucketId: log.bucketId || null,
        date: dateStr,
        uploadCount: 0,
        downloadCount: 0,
        deleteCount: 0,
        listCount: 0,
        bytesUploaded: 0,
        bytesDownloaded: 0,
        requestCount: 0,
      };
      groupMap.set(key, current);
    }

    current.requestCount++;
    if (log.operation === "upload") {
      current.uploadCount++;
      current.bytesUploaded += log.bytesTransferred;
    } else if (log.operation === "download") {
      current.downloadCount++;
      current.bytesDownloaded += log.bytesTransferred;
    } else if (log.operation === "delete") {
      current.deleteCount++;
    } else if (log.operation === "list") {
      current.listCount++;
    }
  }

  let rollupsUpdated = 0;

  for (const item of Array.from(groupMap.values())) {
    // Check for existing rollup
    const existing = await db.query.usageDailyRollups.findFirst({
      where: and(
        eq(usageDailyRollups.userId, item.userId),
        item.bucketId ? eq(usageDailyRollups.bucketId, item.bucketId) : eq(usageDailyRollups.date, item.date),
        eq(usageDailyRollups.date, item.date)
      ),
    });

    if (existing) {
      await db.update(usageDailyRollups)
        .set({
          uploadCount: item.uploadCount,
          downloadCount: item.downloadCount,
          deleteCount: item.deleteCount,
          listCount: item.listCount,
          bytesUploaded: item.bytesUploaded,
          bytesDownloaded: item.bytesDownloaded,
          requestCount: item.requestCount,
          updatedAt: new Date(),
        })
        .where(eq(usageDailyRollups.id, existing.id));
    } else {
      await db.insert(usageDailyRollups).values({
        userId: item.userId,
        bucketId: item.bucketId,
        date: item.date,
        uploadCount: item.uploadCount,
        downloadCount: item.downloadCount,
        deleteCount: item.deleteCount,
        listCount: item.listCount,
        bytesUploaded: item.bytesUploaded,
        bytesDownloaded: item.bytesDownloaded,
        requestCount: item.requestCount,
        updatedAt: new Date(),
      });
    }
    rollupsUpdated++;
  }

  return {
    rowsProcessed: allLogs.length,
    rollupsUpdated,
  };
}
