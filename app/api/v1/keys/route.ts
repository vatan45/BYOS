import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { apiKeys, buckets } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { eq, and, isNull, desc } from "drizzle-orm";

const VALID_SCOPES = ["read", "write", "delete", "list"];

function encodeBase62(buffer: Buffer): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let value = BigInt("0x" + buffer.toString("hex"));
  let res = "";
  const zero = BigInt(0);
  const base = BigInt(62);
  while (value > zero) {
    const remainder = value % base;
    res = chars[Number(remainder)] + res;
    value = value / base;
  }
  return res || "0";
}

/**
 * POST /api/v1/keys
 * Creates a new API key for the authenticated user session.
 * Enforces per-plan quotas and returns the unhashed secret key exactly once.
 */
export async function POST(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized session");
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scopes: string[] = Array.isArray(body.scopes) ? body.scopes : [];
    const bucketId: string | undefined = body.bucketId;

    if (!name) {
      return errorResponse("InvalidRequest", "Key name is required");
    }

    if (scopes.length === 0 || scopes.some((s) => !VALID_SCOPES.includes(s))) {
      return errorResponse(
        "InvalidRequest",
        `Scopes must be a non-empty subset of: ${VALID_SCOPES.join(", ")}`
      );
    }

    // Verify bucket access if restricted
    if (bucketId) {
      const bucket = await db.query.buckets.findFirst({
        where: and(eq(buckets.id, bucketId), eq(buckets.userId, user.id)),
      });
      if (!bucket) {
        return errorResponse("InvalidRequest", "Restricted bucket not found or access denied");
      }
    }

    // Check quota for active keys
    const activeKeys = await db.query.apiKeys.findMany({
      where: and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)),
    });

    const limits = getPlanLimits(user.plan);
    if (activeKeys.length >= limits.maxActiveKeys) {
      return errorResponse(
        "InvalidRequest",
        `Active API key quota (${limits.maxActiveKeys}) reached for the ${user.plan} plan.`
      );
    }

    // Generate token: "byos_live_" + base62 of 32 random bytes
    const randomBytes = crypto.randomBytes(32);
    const base62Token = encodeBase62(randomBytes);
    const fullKey = `byos_live_${base62Token}`;

    // Store prefix ("byos_live_" + 8 characters = 18 characters) for O(1) indexed lookup
    const keyPrefix = fullKey.slice(0, 18);
    const keyHash = await bcrypt.hash(fullKey, 10);

    const [inserted] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        keyPrefix,
        keyHash,
        name,
        scopes,
        bucketRestriction: bucketId || null,
      })
      .returning();

    return NextResponse.json(
      {
        id: inserted.id,
        key: fullKey, // Secret returned exactly once! Never stored in plaintext.
        apiKey: fullKey, // Alias for ergonomic frontend & SDK integration
        name: inserted.name,
        scopes: inserted.scopes,
        bucketRestriction: inserted.bucketRestriction,
        createdAt: inserted.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[CreateKey] Error:", err);
    return errorResponse("InternalError", "Failed to create API key");
  }
}

/**
 * GET /api/v1/keys
 * Lists API keys for the current user (session auth), displaying masked key prefixes.
 */
export async function GET(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized session");
  }

  try {
    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, user.id),
      orderBy: [desc(apiKeys.createdAt)],
    });

    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        keyPrefix: `${k.keyPrefix}...`,
        name: k.name,
        scopes: k.scopes,
        bucketRestriction: k.bucketRestriction,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt,
      })),
    });
  } catch (err) {
    console.error("[ListKeys] Error:", err);
    return errorResponse("InternalError", "Failed to list API keys");
  }
}
