import Redis from "ioredis";
import { env } from "./env";

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  if (!env.REDIS_URL) return null;

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.warn("[Redis] Connection error:", err.message);
    });

    return redis;
  } catch {
    console.warn("[Redis] Failed to create client, caching disabled");
    return null;
  }
}

/**
 * Get a cached value from Redis. Returns null if Redis is unavailable or key doesn't exist.
 */
export async function cacheGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

/**
 * Set a cached value in Redis with optional TTL in seconds. No-op if Redis is unavailable.
 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  } catch {
    // Silently fail — caching is best-effort
  }
}
