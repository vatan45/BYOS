import { db } from "@/lib/db/client";
import { buckets, objects, storageConnections } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { GoogleDriveProvider } from "@/lib/storage/google-drive/provider";

export interface PlanLimits {
  planName: "free" | "pro";
  maxBuckets: number;
  storageLimitBytes: number;
  rateLimitReqPerMin: number;
  maxActiveKeys: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    planName: "free",
    maxBuckets: 1,
    storageLimitBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    rateLimitReqPerMin: 100,
    maxActiveKeys: 20,
  },
  pro: {
    planName: "pro",
    maxBuckets: Infinity,
    storageLimitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    rateLimitReqPerMin: 1000,
    maxActiveKeys: Infinity,
  },
};

export function getPlanLimits(plan: string = "free"): PlanLimits {
  const normalized = (plan || "free").toLowerCase();
  return PLAN_LIMITS[normalized] || PLAN_LIMITS.free;
}

/**
 * Calculates total storage bytes consumed across all buckets belonging to a user on BYOS.
 */
export async function getUserStorageUsageBytes(userId: string): Promise<number> {
  const userBuckets = await db.query.buckets.findMany({
    where: eq(buckets.userId, userId),
  });

  if (userBuckets.length === 0) return 0;

  let totalBytes = 0;
  for (const b of userBuckets) {
    const bucketObjects = await db.query.objects.findMany({
      where: eq(objects.bucketId, b.id),
    });
    for (const obj of bucketObjects) {
      totalBytes += (obj.sizeBytes || 0);
    }
  }
  return totalBytes;
}

/**
 * Checks storage quota while strictly adhering to the "Bring Your Own Storage" (BYOS) philosophy.
 * If the developer has connected their Google Drive, BYOS evaluates upload feasibility against their
 * ACTUAL Google Drive cloud storage capacity rather than artificial subscription tier constraints.
 */
export async function checkStorageQuota(
  userId: string,
  plan: string,
  incomingBytes: number = 0
): Promise<{ allowed: boolean; usedBytes: number; limitBytes: number }> {
  const limits = getPlanLimits(plan);
  const usedBytes = await getUserStorageUsageBytes(userId);
  let limitBytes = limits.storageLimitBytes;

  try {
    const connection = await db.query.storageConnections.findFirst({
      where: and(
        eq(storageConnections.userId, userId),
        eq(storageConnections.status, "active")
      ),
      orderBy: [desc(storageConnections.createdAt)],
    });

    if (connection) {
      const provider = new GoogleDriveProvider(connection.id);
      const quota = await provider.getProviderQuota(connection.id);
      if (quota && quota.totalBytes > 0) {
        limitBytes = quota.totalBytes;
      }
    }
  } catch (e) {
    console.warn("[checkStorageQuota] Fallback to tier quota after Drive inspection error:", e);
  }

  return {
    allowed: (usedBytes + incomingBytes) <= limitBytes,
    usedBytes,
    limitBytes,
  };
}
