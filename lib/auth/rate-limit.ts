import { cacheGet, cacheSet } from "@/lib/redis";
import { errorResponse } from "@/lib/api/errors";
import { NextResponse } from "next/server";

const DEFAULT_RATE_LIMIT = 100; // requests per minute
const WINDOW_SECONDS = 60;

/**
 * Redis token-bucket rate limiter keyed by API key ID.
 * Returns null if the request is allowed, or a NextResponse with 429 if rate-limited.
 * Falls through (allows request) if Redis is unavailable.
 */
export async function checkRateLimit(
  apiKeyId: string | null,
  limit: number = DEFAULT_RATE_LIMIT
): Promise<NextResponse | null> {
  const key = `ratelimit:${apiKeyId || "dashboard_session"}`;

  const currentStr = await cacheGet(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  if (current >= limit) {
    return errorResponse("RateLimitExceeded", "Rate limit exceeded", {
      retryAfter: WINDOW_SECONDS,
    });
  }

  // Increment counter. If this is a new key, set it with TTL.
  // cacheSet with TTL only sets when the key doesn't exist or has expired,
  // so we do an increment pattern:
  await cacheSet(key, String(current + 1), current === 0 ? WINDOW_SECONDS : undefined);

  return null;
}
