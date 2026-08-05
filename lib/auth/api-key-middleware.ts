import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { apiKeys, buckets, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDashboardSessionUser } from "@/lib/auth/session";

export interface AuthContext {
  apiKeyId: string | null;
  userId: string;
  scopes: string[];
  bucketRestriction: string | null;
  plan: string;
}

/**
 * Validates an API key from the Authorization header.
 * Format: "Bearer byos_live_xxxx..."
 *
 * Performs fast indexed lookup by key_prefix, followed by secure bcrypt comparison.
 * Rejects revoked keys and resolves the user's plan.
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<AuthContext | string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "Missing or malformed Authorization header";
  }

  const rawKey = authHeader.slice(7).trim(); // Remove "Bearer "
  if (!rawKey.startsWith("byos_")) {
    return "Invalid API key format";
  }

  // Use the prefix (e.g., "byos_live_" + first 8 characters of random string = 18 chars) for fast indexed query
  const keyPrefix = rawKey.length >= 18 ? rawKey.slice(0, 18) : rawKey.slice(0, 8);

  const candidates = await db.query.apiKeys.findMany({
    where: eq(apiKeys.keyPrefix, keyPrefix),
  });

  if (candidates.length === 0) {
    return "Invalid API key";
  }

  // Check candidates with timing-safe bcrypt hash comparison
  let matchedKey = null;
  for (const cand of candidates) {
    const isMatch = await bcrypt.compare(rawKey, cand.keyHash);
    if (isMatch) {
      matchedKey = cand;
      break;
    }
  }

  if (!matchedKey) {
    return "Invalid API key";
  }

  // Reject if revoked_at is set
  if (matchedKey.revokedAt !== null && matchedKey.revokedAt !== undefined) {
    return "API key has been revoked";
  }

  // Update last_used_at asynchronously (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, matchedKey.id))
    .then(() => {})
    .catch(() => {});

  // Resolve user plan for rate and quota enforcement
  const user = await db.query.users.findFirst({
    where: eq(users.id, matchedKey.userId),
  });
  const plan = user?.plan || "free";

  return {
    apiKeyId: matchedKey.id,
    userId: matchedKey.userId,
    scopes: matchedKey.scopes,
    bucketRestriction: matchedKey.bucketRestriction,
    plan,
  };
}

/**
 * Checks if the auth context has the required scope for an operation.
 */
export function hasScope(auth: AuthContext, requiredScope: string): boolean {
  return auth.scopes.includes(requiredScope);
}

/**
 * Checks if the auth context is allowed to access a specific bucket.
 * Returns the bucket record if allowed, or null if restricted.
 */
export async function checkBucketAccess(
  auth: AuthContext,
  bucketName: string
): Promise<{ id: string; connectionId: string; providerFolderId: string } | null> {
  const bucket = await db.query.buckets.findFirst({
    where: and(
      eq(buckets.userId, auth.userId),
      eq(buckets.name, bucketName)
    ),
  });

  if (!bucket) return null;

  // Reject if bucket_restriction is set and doesn't match the requested bucket
  if (
    auth.bucketRestriction &&
    auth.bucketRestriction !== bucket.id &&
    auth.bucketRestriction !== bucket.name
  ) {
    return null;
  }

  return {
    id: bucket.id,
    connectionId: bucket.connectionId,
    providerFolderId: bucket.providerFolderId,
  };
}

/**
 * Validates either an external API key or falls back to an authenticated dashboard session.
 * Ensures the dashboard UI (e.g., /objects explorer) can seamlessly perform storage operations.
 */
export async function validateApiOrDashboardAuth(
  request: NextRequest | Request
): Promise<AuthContext | string> {
  const authHeader = request.headers.get("authorization");
  let keyError: string | null = null;

  // Attempt standard API key validation if header is present
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const res = await validateApiKey(authHeader);
    if (typeof res !== "string") {
      return res;
    }
    keyError = res;
  }

  // Fall back to dashboard user session (allows UI Object Browser to list/manage files cleanly)
  const sessionUser = await getDashboardSessionUser(request);
  if (sessionUser) {
    return {
      apiKeyId: null,
      userId: sessionUser.id,
      scopes: ["read", "write", "list", "delete"],
      bucketRestriction: null,
      plan: sessionUser.plan,
    };
  }

  return keyError || "Missing or invalid authorization or dashboard session";
}
