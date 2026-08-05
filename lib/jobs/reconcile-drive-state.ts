import { db } from "@/lib/db/client";
import { buckets, objects, objectVersions } from "@/lib/db/schema";
import { getProvider } from "@/lib/api/resolve-provider";
import { eq } from "drizzle-orm";
import { Queue, Worker } from "bullmq";
import { env } from "@/lib/env";
import { captureException } from "@/lib/monitoring";

export const RECONCILE_DRIVE_QUEUE = "reconcile-drive-queue";

export interface ReconciliationResult {
  bucketId: string;
  orphaned: number;
  discovered: number;
  restored: number;
}

/**
 * Reconciles the database metadata state against actual files in the storage provider for a single bucket.
 */
export async function reconcileBucket(bucketId: string): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { bucketId, orphaned: 0, discovered: 0, restored: 0 };
  const bucket = await db.query.buckets.findFirst({ where: eq(buckets.id, bucketId) });
  if (!bucket) return result;

  let liveObjects;
  try {
    const provider = getProvider(bucket.connectionId);
    liveObjects = await provider.listAllObjectsRecursive(bucket.id);
  } catch (err) {
    console.warn(`[Reconcile] Failed to list live provider items for bucket ${bucketId}:`, err);
    return result;
  }

  const liveMap = new Map(liveObjects.map((o) => [o.key, o]));
  const liveIds = new Set(liveObjects.map((o) => String(o.metadata.providerFileId || "")));

  const dbObjects = await db.query.objects.findMany({
    where: eq(objects.bucketId, bucket.id),
  });

  const dbKeys = new Set(dbObjects.map((o) => o.key));
  const dbFileIds = new Set(dbObjects.map((o) => o.providerFileId));

  // 1. Check for orphaned DB records (deleted in Drive directly outside BYOS)
  for (const dbObj of dbObjects) {
    const isPresentInDrive = liveMap.has(dbObj.key) || liveIds.has(dbObj.providerFileId);
    if (!isPresentInDrive) {
      if (dbObj.syncStatus !== "missing_in_provider") {
        await db
          .update(objects)
          .set({ syncStatus: "missing_in_provider", updatedAt: new Date() })
          .where(eq(objects.id, dbObj.id));
        result.orphaned++;
      }
    } else {
      // File has been restored or reappeared in Drive
      if (dbObj.syncStatus === "missing_in_provider") {
        await db
          .update(objects)
          .set({ syncStatus: "synced", updatedAt: new Date() })
          .where(eq(objects.id, dbObj.id));
        result.restored++;
      }
    }
  }

  // 2. Check for untracked files in Drive (uploaded directly outside BYOS)
  for (const liveObj of liveObjects) {
    const providerId = String(liveObj.metadata.providerFileId || "");
    if (!dbKeys.has(liveObj.key) && !dbFileIds.has(providerId)) {
      try {
        const [inserted] = await db
          .insert(objects)
          .values({
            bucketId: bucket.id,
            key: liveObj.key,
            providerFileId: providerId,
            sizeBytes: liveObj.metadata.size,
            contentType: liveObj.metadata.contentType,
            etag: String(liveObj.metadata.etag || "unknown"),
            syncStatus: "discovered",
            updatedAt: liveObj.metadata.updatedAt,
          })
          .returning();

        // Register initial version record for the discovered object
        const [version] = await db
          .insert(objectVersions)
          .values({
            objectId: inserted.id,
            providerFileId: providerId,
            sizeBytes: liveObj.metadata.size,
            etag: String(liveObj.metadata.etag || "unknown"),
            versionNumber: 1,
            createdAt: liveObj.metadata.updatedAt,
          })
          .returning();

        await db
          .update(objects)
          .set({ currentVersionId: version.id })
          .where(eq(objects.id, inserted.id));

        dbKeys.add(liveObj.key);
        dbFileIds.add(providerId);
        result.discovered++;
      } catch (err) {
        console.warn(`[Reconcile] Failed to insert discovered object ${liveObj.key}:`, err);
      }
    }
  }

  return result;
}

/**
 * Reconciles all buckets associated with a specific storage connection.
 */
export async function reconcileConnection(connectionId: string): Promise<ReconciliationResult[]> {
  const connectionBuckets = await db.query.buckets.findMany({
    where: eq(buckets.connectionId, connectionId),
  });

  const results: ReconciliationResult[] = [];
  for (const bucket of connectionBuckets) {
    results.push(await reconcileBucket(bucket.id));
  }
  return results;
}

/**
 * Reconciles all active storage connections across the application.
 */
export async function runDriveReconciliation(): Promise<{
  connectionsProcessed: number;
  results: ReconciliationResult[];
}> {
  const allConnections = await db.query.storageConnections.findMany();
  const results: ReconciliationResult[] = [];

  for (const conn of allConnections) {
    const res = await reconcileConnection(conn.id);
    results.push(...res);
  }

  return {
    connectionsProcessed: allConnections.length,
    results,
  };
}

// ── BullMQ Setup ──────────────────────────────────────────────────────────

let reconcileQueue: Queue | null = null;
let reconcileWorker: Worker | null = null;

export function initReconcileDriveQueue(): Queue | null {
  if (reconcileQueue) return reconcileQueue;
  if (!env.REDIS_URL) return null;

  try {
    const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
    reconcileQueue = new Queue(RECONCILE_DRIVE_QUEUE, { connection });

    if (!reconcileWorker && typeof window === "undefined") {
      reconcileWorker = new Worker(
        RECONCILE_DRIVE_QUEUE,
        async (job) => {
          console.log(`[BullMQ] Starting Drive state reconciliation job ${job.id}`);
          let res;
          if (job.data?.connectionId) {
            res = await reconcileConnection(job.data.connectionId);
          } else if (job.data?.bucketId) {
            res = await reconcileBucket(job.data.bucketId);
          } else {
            res = await runDriveReconciliation();
          }
          console.log(`[BullMQ] Reconciliation job finished:`, res);
          return res;
        },
        { connection }
      );

      reconcileWorker.on("failed", (job, err) => {
        console.error(`[BullMQ] Reconciliation job ${job?.id} failed:`, err);
        captureException(err, { job: RECONCILE_DRIVE_QUEUE, jobId: job?.id });
      });
    }

    return reconcileQueue;
  } catch (err) {
    console.warn("[BullMQ] Failed to initialize reconciliation queue/worker:", err);
    captureException(err, { job: RECONCILE_DRIVE_QUEUE, stage: "initialization" });
    return null;
  }
}

/**
 * Register 6-hourly recurring reconciliation schedule (0 * /6 * * *).
 */
export async function setupReconcileDriveCron(): Promise<void> {
  const queue = initReconcileDriveQueue();
  if (!queue) return;

  await queue.upsertJobScheduler(
    "every-6-hours-reconcile",
    {
      pattern: "0 */6 * * *", // every 6 hours
    },
    {
      data: {},
    }
  );
}
