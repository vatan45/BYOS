import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { storageConnections, buckets, objects, apiKeys } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { getPlanLimits, getUserStorageUsageBytes } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { eq, and, isNull, desc } from "drizzle-orm";
import { GoogleDriveProvider } from "@/lib/storage/google-drive/provider";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/dashboard/overview
 * Returns comprehensive developer platform summary data: connection state, buckets, storage quotas, and active keys.
 */
export async function GET(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized dashboard session");
  }

  try {
    const connection = await db.query.storageConnections.findFirst({
      where: and(
        eq(storageConnections.userId, user.id),
        eq(storageConnections.status, "active")
      ),
      orderBy: [desc(storageConnections.createdAt)],
    });

    const userBuckets = await db.query.buckets.findMany({
      where: eq(buckets.userId, user.id),
      orderBy: [desc(buckets.createdAt)],
    });

    const bucketSummaries = await Promise.all(
      userBuckets.map(async (b) => {
        const bucketObjects = await db.query.objects.findMany({
          where: eq(objects.bucketId, b.id),
        });
        const sizeBytes = bucketObjects.reduce(
          (acc, curr) => acc + (curr.sizeBytes || 0),
          0
        );
        return {
          id: b.id,
          name: b.name,
          providerFolderId: b.providerFolderId,
          objectCount: bucketObjects.length,
          sizeBytes,
          createdAt: b.createdAt,
        };
      })
    );

    const activeKeys = await db.query.apiKeys.findMany({
      where: and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)),
    });

    const totalUsedBytes = await getUserStorageUsageBytes(user.id);
    const planLimits = getPlanLimits(user.plan);
    let limitBytes = planLimits.storageLimitBytes;

    if (connection) {
      try {
        const provider = new GoogleDriveProvider(connection.id);
        const quota = await provider.getProviderQuota(connection.id);
        if (quota && quota.totalBytes > 0) {
          limitBytes = quota.totalBytes;
        }
      } catch (err) {
        console.warn("[DashboardOverview] Could not fetch Drive quota, using tier fallback:", err);
      }
    }

    const allowedAdminEmails = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
      : ["developer@byos.dev", "iamvatan.dev@gmail.com"];
    const isAdmin = allowedAdminEmails.includes(user.email.toLowerCase()) || user.id === "00000000-0000-0000-0000-000000000000";

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        isAdmin,
      },
      connection: {
        connected: Boolean(connection),
        email: connection?.providerAccountEmail || null,
        status: connection?.status || "unconnected",
        expiresAt: connection?.tokenExpiresAt || null,
      },
      buckets: bucketSummaries,
      usage: {
        usedBytes: totalUsedBytes,
        limitBytes,
        percentage: Math.min(
          100,
          Math.round((totalUsedBytes / limitBytes) * 100)
        ),
        activeKeysCount: activeKeys.length,
        maxKeys: planLimits.maxActiveKeys === Infinity ? "Unlimited" : planLimits.maxActiveKeys,
      },
    });
  } catch (err) {
    console.error("[DashboardOverview] Error:", err);
    return errorResponse("InternalError", "Failed to load developer overview statistics");
  }
}
