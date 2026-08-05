import { db } from "@/lib/db/client";
import { usageLogs } from "@/lib/db/schema";

/**
 * Logs a storage operation asynchronously (fire-and-forget).
 * Never blocks the caller or throws — all errors are silently caught.
 */
export function logUsage(params: {
  userId: string;
  bucketId: string;
  apiKeyId: string | null;
  operation: "upload" | "download" | "delete" | "list";
  objectKey?: string | null;
  bytesTransferred: number;
}): void {
  // Fire-and-forget — do not await
  db.insert(usageLogs)
    .values({
      userId: params.userId,
      bucketId: params.bucketId,
      apiKeyId: params.apiKeyId,
      operation: params.operation,
      objectKey: params.objectKey || null,
      bytesTransferred: params.bytesTransferred,
    })
    .then(() => {})
    .catch((err) => {
      console.warn("[UsageLogger] Failed to log usage:", err);
    });
}
