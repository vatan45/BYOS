import { UploadData } from "./types";
import { BYOSError } from "./errors";

/**
 * Normalizes input payloads across Node.js (Buffers, Streams) and Browser (Blobs, Files, Strings) runtimes.
 * Automatically extracts content metadata when available.
 */
export function normalizeUploadBody(
  data: UploadData,
  defaultContentType?: string
): { body: BodyInit | null | undefined; contentType: string } {
  let contentType = defaultContentType || "application/octet-stream";
  let body: any = data;

  if (data === null || data === undefined) {
    body = "";
  } else if (typeof data === "string") {
    body = data;
    if (!defaultContentType) {
      contentType = "text/plain; charset=utf-8";
    }
  } else if (typeof Blob !== "undefined" && data instanceof Blob) {
    body = data;
    if (!defaultContentType && data.type) {
      contentType = data.type;
    }
  } else if (typeof File !== "undefined" && data instanceof File) {
    body = data;
    if (!defaultContentType && data.type) {
      contentType = data.type;
    }
  }

  return { body, contentType };
}

/**
 * Executes an asynchronous network request function with exponential backoff and jitter retries.
 * Retries strictly on rate limits (429) and temporary server faults (500, 502, 503, 504).
 * Instantly raises terminal errors (400, 401, 403, 404, 507 Quotas).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;

      // Decide whether to retry based on error status or networking timeout exceptions
      const status: number | undefined = err instanceof BYOSError ? err.status : err.status;
      const isRetryableStatus = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      const isNetworkFault = !status && (err.name === "FetchError" || err.name === "TypeError" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND");

      if ((!isRetryableStatus && !isNetworkFault) || attempt > maxRetries) {
        throw err;
      }

      // Calculate exponential backoff: (2^attempt * 100ms) + randomized jitter (up to 100ms)
      const delay = Math.min(Math.pow(2, attempt - 1) * 150 + Math.random() * 100, 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
