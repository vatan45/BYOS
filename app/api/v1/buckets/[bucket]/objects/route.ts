import { NextRequest, NextResponse } from "next/server";
import { validateApiOrDashboardAuth, hasScope, checkBucketAccess } from "@/lib/auth/api-key-middleware";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getPlanLimits } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { logUsage } from "@/lib/api/usage-logger";
import { db } from "@/lib/db/client";
import { objects } from "@/lib/db/schema";
import { eq, and, like, asc, gt } from "drizzle-orm";
import { handleCorsPreflightRequest } from "@/lib/api/cors";
import { captureException } from "@/lib/monitoring";

/**
 * GET /api/v1/buckets/{bucket}/objects
 * Lists objects in a bucket with S3 ListObjectsV2-shaped response.
 * Reads directly from DB metadata index and surfaces SyncStatus for staleness monitoring.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { bucket: string } }
) {
  // Auth
  const auth = await validateApiOrDashboardAuth(request);
  if (typeof auth === "string") {
    return errorResponse("InvalidApiKey", auth);
  }

  // Rate limit
  const rateLimited = await checkRateLimit(auth.apiKeyId, getPlanLimits(auth.plan).rateLimitReqPerMin);
  if (rateLimited) return rateLimited;

  // Scope check
  if (!hasScope(auth, "list")) {
    return errorResponse("MissingScope", "API key does not have 'list' scope");
  }

  // Bucket access
  const bucket = await checkBucketAccess(auth, params.bucket);
  if (!bucket) {
    return errorResponse("NoSuchBucket", `Bucket '${params.bucket}' not found or access denied`);
  }

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("prefix") || undefined;
  const cursor = searchParams.get("continuation-token") || searchParams.get("start-after") || undefined;
  const maxKeysParam = parseInt(searchParams.get("max-keys") || "1000", 10);
  const maxKeys = isNaN(maxKeysParam) || maxKeysParam <= 0 ? 1000 : maxKeysParam;

  try {
    const conditions = [eq(objects.bucketId, bucket.id)];
    if (prefix) {
      conditions.push(like(objects.key, `${prefix}%`));
    }
    if (cursor) {
      conditions.push(gt(objects.key, cursor));
    }

    const dbObjects = await db.query.objects.findMany({
      where: and(...conditions),
      orderBy: [asc(objects.key)],
      limit: maxKeys + 1,
    });

    const isTruncated = dbObjects.length > maxKeys;
    const contents = isTruncated ? dbObjects.slice(0, maxKeys) : dbObjects;
    const nextCursor = isTruncated && contents.length > 0 ? contents[contents.length - 1].key : undefined;

    // Log usage async
    logUsage({
      userId: auth.userId,
      bucketId: bucket.id,
      apiKeyId: auth.apiKeyId,
      operation: "list",
      bytesTransferred: 0,
    });

    return NextResponse.json({
      Name: params.bucket,
      Prefix: prefix || "",
      IsTruncated: isTruncated,
      NextContinuationToken: nextCursor,
      Contents: contents.map((obj) => ({
        Key: obj.key,
        Size: obj.sizeBytes,
        ETag: obj.etag,
        LastModified: obj.updatedAt,
        SyncStatus: obj.syncStatus,
      })),
      KeyCount: contents.length,
    });
  } catch (err) {
    console.error("[ListObjects] Error:", err);
    captureException(err, { endpoint: "GET /objects", bucket: params.bucket });
    return errorResponse("InternalError", "Failed to list objects");
  }
}

export async function OPTIONS() {
  return handleCorsPreflightRequest();
}
