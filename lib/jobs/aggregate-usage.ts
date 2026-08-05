import { Queue, Worker } from "bullmq";
import { env } from "@/lib/env";
import { runUsageAggregation } from "@/lib/jobs/aggregate-core";
import { captureException } from "@/lib/monitoring";

export const AGGREGATE_USAGE_QUEUE = "aggregate-usage-queue";
export { runUsageAggregation };

// ── BullMQ Setup ──────────────────────────────────────────────────────────

let aggregateQueue: Queue | null = null;
let aggregateWorker: Worker | null = null;

export function initAggregateUsageQueue(): Queue | null {
  if (aggregateQueue) return aggregateQueue;
  if (!env.REDIS_URL) return null;

  try {
    const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
    aggregateQueue = new Queue(AGGREGATE_USAGE_QUEUE, { connection });

    if (!aggregateWorker && typeof window === "undefined") {
      aggregateWorker = new Worker(
        AGGREGATE_USAGE_QUEUE,
        async (job) => {
          console.log(`[BullMQ] Starting hourly usage aggregation job ${job.id}`);
          const res = await runUsageAggregation();
          console.log(`[BullMQ] Usage aggregation completed:`, res);
          return res;
        },
        { connection }
      );

      aggregateWorker.on("failed", (job, err) => {
        console.error(`[BullMQ] Usage aggregation job ${job?.id} failed:`, err);
        captureException(err, { job: AGGREGATE_USAGE_QUEUE, jobId: job?.id });
      });
    }

    return aggregateQueue;
  } catch (err) {
    console.warn("[BullMQ] Failed to initialize usage aggregation queue/worker:", err);
    captureException(err, { job: AGGREGATE_USAGE_QUEUE, stage: "initialization" });
    return null;
  }
}

/**
 * Register hourly recurring job for usage rollup aggregation (0 * * * *).
 */
export async function setupAggregateUsageCron(): Promise<void> {
  const queue = initAggregateUsageQueue();
  if (!queue) return;

  await queue.upsertJobScheduler(
    "hourly-aggregate",
    {
      pattern: "0 * * * *", // run top of every hour
    },
    {
      data: {},
    }
  );
}
