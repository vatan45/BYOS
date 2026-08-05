import { db } from "@/lib/db/client";
import { objectVersions, buckets } from "@/lib/db/schema";
import { getProvider } from "@/lib/api/resolve-provider";
import { eq, desc } from "drizzle-orm";
import { Queue, Worker } from "bullmq";
import { env } from "@/lib/env";
import { captureException } from "@/lib/monitoring";

export const PRUNE_VERSIONS_QUEUE = "prune-versions-queue";
const DEFAULT_RETENTION_LIMIT = 10;

/**
 * Core version pruning logic.
 * Keeps the newest N versions per object (default 10) and deletes older ones from both Drive and DB.
 */
export async function runVersionPruning(retentionLimit: number = DEFAULT_RETENTION_LIMIT): Promise<{
  objectsProcessed: number;
  prunedCount: number;
}> {
  const allObjects = await db.query.objects.findMany();
  let prunedCount = 0;

  for (const obj of allObjects) {
    const versions = await db.query.objectVersions.findMany({
      where: eq(objectVersions.objectId, obj.id),
      orderBy: [desc(objectVersions.versionNumber)],
    });

    if (versions.length <= retentionLimit) {
      continue;
    }

    // Identify old versions exceeding the retention limit
    const candidatesForPruning = versions.slice(retentionLimit);
    
    // Never prune the currently active version pointer regardless of order
    const toPrune = candidatesForPruning.filter((v) => v.id !== obj.currentVersionId);
    if (toPrune.length === 0) continue;

    const bucket = await db.query.buckets.findFirst({
      where: eq(buckets.id, obj.bucketId),
    });

    for (const ver of toPrune) {
      if (bucket) {
        try {
          const provider = getProvider(bucket.connectionId);
          await provider.deleteProviderFile(ver.providerFileId);
        } catch (err) {
          console.warn(`[VersionPrune] Failed to delete file ${ver.providerFileId} from provider:`, err);
        }
      }

      await db.delete(objectVersions).where(eq(objectVersions.id, ver.id));
      prunedCount++;
    }
  }

  return {
    objectsProcessed: allObjects.length,
    prunedCount,
  };
}

// ── BullMQ Setup ──────────────────────────────────────────────────────────

let pruneQueue: Queue | null = null;
let pruneWorker: Worker | null = null;

export function initPruneVersionsQueue(): Queue | null {
  if (pruneQueue) return pruneQueue;
  if (!env.REDIS_URL) return null;

  try {
    const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
    pruneQueue = new Queue(PRUNE_VERSIONS_QUEUE, { connection });
    
    // Initialize worker if not already running
    if (!pruneWorker && typeof window === "undefined") {
      pruneWorker = new Worker(
        PRUNE_VERSIONS_QUEUE,
        async (job) => {
          console.log(`[BullMQ] Starting version pruning job ${job.id}`);
          const res = await runVersionPruning(job.data?.retentionLimit || DEFAULT_RETENTION_LIMIT);
          console.log(`[BullMQ] Version pruning completed:`, res);
          return res;
        },
        { connection }
      );

      pruneWorker.on("failed", (job, err) => {
        console.error(`[BullMQ] Version pruning job ${job?.id} failed:`, err);
        captureException(err, { job: PRUNE_VERSIONS_QUEUE, jobId: job?.id });
      });
    }

    return pruneQueue;
  } catch (err) {
    console.warn("[BullMQ] Failed to initialize version pruning queue/worker:", err);
    captureException(err, { job: PRUNE_VERSIONS_QUEUE, stage: "initialization" });
    return null;
  }
}

/**
 * Register daily recurring job for pruning versions (0 0 * * *).
 */
export async function setupPruneVersionsCron(): Promise<void> {
  const queue = initPruneVersionsQueue();
  if (!queue) return;

  await queue.upsertJobScheduler(
    "daily-prune",
    {
      pattern: "0 0 * * *", // midnight daily
    },
    {
      data: { retentionLimit: DEFAULT_RETENTION_LIMIT },
    }
  );
}
