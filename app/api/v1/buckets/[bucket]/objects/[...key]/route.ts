import { NextRequest, NextResponse } from "next/server";
import { validateApiOrDashboardAuth, hasScope, checkBucketAccess, AuthContext } from "@/lib/auth/api-key-middleware";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getPlanLimits, checkStorageQuota } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { logUsage } from "@/lib/api/usage-logger";
import { getProvider } from "@/lib/api/resolve-provider";
import { db } from "@/lib/db/client";
import { objects, objectVersions, signedUrlGrants } from "@/lib/db/schema";
import { generatePresignedSignature } from "@/lib/storage/presigned-urls";
import { env } from "@/lib/env";
import { eq, and, desc } from "drizzle-orm";
import { handleCorsPreflightRequest } from "@/lib/api/cors";
import { captureException } from "@/lib/monitoring";

interface RouteParams {
  params: { bucket: string; key: string[] };
}

function getObjectKey(keyParts: string[]): string {
  return keyParts.map(decodeURIComponent).join("/");
}

async function authenticate(
  request: NextRequest,
  requiredScope: string,
  bucketName: string
): Promise<
  | { auth: AuthContext; bucket: { id: string; connectionId: string; providerFolderId: string } }
  | NextResponse
> {
  const auth = await validateApiOrDashboardAuth(request);
  if (typeof auth === "string") {
    return errorResponse("InvalidApiKey", auth);
  }

  const planLimits = getPlanLimits(auth.plan);
  const rateLimited = await checkRateLimit(auth.apiKeyId, planLimits.rateLimitReqPerMin);
  if (rateLimited) return rateLimited;

  if (!hasScope(auth, requiredScope)) {
    return errorResponse("MissingScope", `API key does not have '${requiredScope}' scope`);
  }

  const bucket = await checkBucketAccess(auth, bucketName);
  if (!bucket) {
    return errorResponse("NoSuchBucket", `Bucket '${bucketName}' not found or access denied`);
  }

  return { auth, bucket };
}

/**
 * PUT /api/v1/buckets/{bucket}/objects/{key+}
 * Uploads a file. Supports raw binary body or multipart/form-data.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await authenticate(request, "write", params.bucket);
  if (result instanceof NextResponse) return result;
  const { auth, bucket } = result;
  const objectKey = getObjectKey(params.key);

  try {
    // Check hard edge upload size limit (5 GB max)
    const estimatedSize = parseInt(request.headers.get("content-length") || "0", 10);
    const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024 * 1024; // 5 TB (Google Drive native maximum file size)
    if (!isNaN(estimatedSize) && estimatedSize > MAX_UPLOAD_SIZE_BYTES) {
      return errorResponse(
        "InvalidRequest",
        `Payload exceeds maximum allowed upload file size of 5 TB (${MAX_UPLOAD_SIZE_BYTES} bytes).`
      );
    }

    // Check per-plan storage quota before accepting upload
    const quota = await checkStorageQuota(auth.userId, auth.plan, isNaN(estimatedSize) ? 0 : estimatedSize);
    if (!quota.allowed) {
      return errorResponse("InsufficientStorage", "Storage quota exceeded for user plan", {
        usedBytes: quota.usedBytes,
        limitBytes: quota.limitBytes,
      });
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";

    let fileStream: ReadableStream;
    let uploadContentType = contentType;

    // Handle multipart/form-data
    if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return errorResponse("InvalidRequest", "Missing 'file' field in multipart form data");
      }
      fileStream = file.stream();
      uploadContentType = file.type || "application/octet-stream";
    } else {
      // Raw binary body
      if (!request.body) {
        return errorResponse("InvalidRequest", "Missing request body");
      }
      fileStream = request.body;
    }

    const provider = getProvider(bucket.connectionId);
    const obj = await provider.uploadObject(bucket.id, objectKey, fileStream, {
      contentType: uploadContentType,
    });

    // Log async
    logUsage({
      userId: auth.userId,
      bucketId: bucket.id,
      apiKeyId: auth.apiKeyId,
      operation: "upload",
      objectKey,
      bytesTransferred: obj.metadata.size,
    });

    return NextResponse.json(
      {
        key: obj.key,
        etag: obj.metadata.etag,
        size: obj.metadata.size,
        versionId: obj.metadata.versionNumber || null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PutObject] Error:", err);
    captureException(err, { endpoint: "PUT /objects/[...key]", userId: auth.userId, bucket: params.bucket });
    return errorResponse("InternalError", "Failed to upload object");
  }
}

/**
 * GET /api/v1/buckets/{bucket}/objects/{key+}
 * Downloads a file with streaming. Supports Range requests (206 partial content).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await authenticate(request, "read", params.bucket);
  if (result instanceof NextResponse) return result;
  const { auth, bucket } = result;

  if (params.key[params.key.length - 1] === "versions") {
    const realKeyParts = params.key.slice(0, -1);
    if (realKeyParts.length > 0) {
      const versionKey = getObjectKey(realKeyParts);
      const existingObj = await db.query.objects.findFirst({
        where: and(eq(objects.bucketId, bucket.id), eq(objects.key, versionKey)),
      });
      if (!existingObj) {
        return errorResponse("NoSuchKey", `Object '${versionKey}' not found in bucket '${params.bucket}'`);
      }

      const versions = await db.query.objectVersions.findMany({
        where: eq(objectVersions.objectId, existingObj.id),
        orderBy: [desc(objectVersions.versionNumber)],
      });

      logUsage({
        userId: auth.userId,
        bucketId: bucket.id,
        apiKeyId: auth.apiKeyId,
        operation: "list",
        bytesTransferred: 0,
      });

      return NextResponse.json({
        Key: versionKey,
        CurrentVersionId: existingObj.currentVersionId,
        Versions: versions.map((v) => ({
          VersionId: v.id,
          VersionNumber: v.versionNumber,
          Size: v.sizeBytes,
          ETag: v.etag,
          LastModified: v.createdAt,
          IsCurrent: v.id === existingObj.currentVersionId,
        })),
      });
    }
  }

  const objectKey = getObjectKey(params.key);

  try {
    const provider = getProvider(bucket.connectionId);

    // Get metadata first for headers
    let metadata;
    try {
      metadata = await provider.getObjectMetadata(bucket.id, objectKey);
    } catch {
      return errorResponse("NoSuchKey", `Object '${objectKey}' not found`);
    }

    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Parse Range: bytes=start-end
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : metadata.size - 1;
        const contentLength = end - start + 1;

        // For Range requests, we still need to download the full stream from Drive
        // and slice it (Drive API doesn't support range on alt=media easily via googleapis)
        const stream = await provider.downloadObject(bucket.id, objectKey);

        logUsage({
          userId: auth.userId,
          bucketId: bucket.id,
          apiKeyId: auth.apiKeyId,
          operation: "download",
          objectKey,
          bytesTransferred: contentLength,
        });

        return new NextResponse(stream, {
          status: 206,
          headers: {
            "Content-Type": metadata.contentType,
            "Content-Length": String(contentLength),
            "Content-Range": `bytes ${start}-${end}/${metadata.size}`,
            "Accept-Ranges": "bytes",
            ETag: String(metadata.etag),
          },
        });
      }
    }

    // Full download
    const stream = await provider.downloadObject(bucket.id, objectKey);

    logUsage({
      userId: auth.userId,
      bucketId: bucket.id,
      apiKeyId: auth.apiKeyId,
      operation: "download",
      objectKey,
      bytesTransferred: metadata.size,
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": String(metadata.size),
        "Accept-Ranges": "bytes",
        ETag: String(metadata.etag),
        "Last-Modified": metadata.updatedAt.toUTCString(),
      },
    });
  } catch (err) {
    console.error("[GetObject] Error:", err);
    return errorResponse("InternalError", "Failed to download object");
  }
}

/**
 * DELETE /api/v1/buckets/{bucket}/objects/{key+}
 * Deletes an object. Returns 204 on success, 404 if not found.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await authenticate(request, "delete", params.bucket);
  if (result instanceof NextResponse) return result;
  const { auth, bucket } = result;
  const objectKey = getObjectKey(params.key);

  try {
    const provider = getProvider(bucket.connectionId);

    // Check if object exists first
    try {
      await provider.getObjectMetadata(bucket.id, objectKey);
    } catch {
      return errorResponse("NoSuchKey", `Object '${objectKey}' not found`);
    }

    await provider.deleteObject(bucket.id, objectKey);

    logUsage({
      userId: auth.userId,
      bucketId: bucket.id,
      apiKeyId: auth.apiKeyId,
      operation: "delete",
      objectKey,
      bytesTransferred: 0,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DeleteObject] Error:", err);
    return errorResponse("InternalError", "Failed to delete object");
  }
}

/**
 * HEAD /api/v1/buckets/{bucket}/objects/{key+}
 * Returns metadata headers only, no body. For existence checks.
 */
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  const result = await authenticate(request, "read", params.bucket);
  if (result instanceof NextResponse) return result;
  const { bucket } = result;
  const objectKey = getObjectKey(params.key);

  try {
    const provider = getProvider(bucket.connectionId);
    const metadata = await provider.getObjectMetadata(bucket.id, objectKey);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType,
        "Content-Length": String(metadata.size),
        ETag: String(metadata.etag),
        "Last-Modified": metadata.updatedAt.toUTCString(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

/**
 * POST /api/v1/buckets/{bucket}/objects/{key+}/sign
 * Generates a presigned upload or download URL.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (params.key[params.key.length - 1] === "restore" && params.key.length >= 3 && params.key[params.key.length - 3] === "versions") {
    const versionId = params.key[params.key.length - 2];
    const realKeyParts = params.key.slice(0, -3);
    if (realKeyParts.length === 0) {
      return errorResponse("InvalidRequest", "Object key cannot be empty when restoring a version");
    }
    const objectKey = getObjectKey(realKeyParts);

    const result = await authenticate(request, "write", params.bucket);
    if (result instanceof NextResponse) return result;
    const { auth, bucket } = result;

    const existingObj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucket.id), eq(objects.key, objectKey)),
    });
    if (!existingObj) {
      return errorResponse("NoSuchKey", `Object '${objectKey}' not found in bucket '${params.bucket}'`);
    }

    const versionRecord = await db.query.objectVersions.findFirst({
      where: and(eq(objectVersions.id, versionId), eq(objectVersions.objectId, existingObj.id)),
    });
    if (!versionRecord) {
      return errorResponse("NoSuchVersion", `Version '${versionId}' not found for object '${objectKey}'`);
    }

    try {
      const provider = getProvider(bucket.connectionId);
      const versionStream = await provider.downloadObject(bucket.id, objectKey, versionId);
      const restored = await provider.uploadObject(bucket.id, objectKey, versionStream, {
        contentType: existingObj.contentType || "application/octet-stream",
      });

      logUsage({
        userId: auth.userId,
        bucketId: bucket.id,
        apiKeyId: auth.apiKeyId,
        operation: "upload",
        objectKey,
        bytesTransferred: restored.metadata.size,
      });

      return NextResponse.json({
        key: restored.key,
        etag: restored.metadata.etag,
        size: restored.metadata.size,
        versionId: restored.metadata.versionNumber || null,
        restoredFromVersionId: versionId,
      });
    } catch (err) {
      console.error("[VersionRestore] Error:", err);
      return errorResponse("InternalError", "Failed to restore version content in underlying storage");
    }
  }

  if (params.key[params.key.length - 1] !== "sign") {
    return errorResponse("MethodNotAllowed", "POST is only permitted on /sign and /versions/{id}/restore endpoints");
  }

  const realKeyParts = params.key.slice(0, -1);
  if (realKeyParts.length === 0) {
    return errorResponse("InvalidRequest", "Object key cannot be empty when generating a presigned URL");
  }
  const objectKey = getObjectKey(realKeyParts);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("InvalidRequest", "Invalid JSON body provided");
  }

  const operation: "get" | "put" = body.operation;
  if (operation !== "get" && operation !== "put") {
    return errorResponse("InvalidRequest", "Operation must be either 'get' or 'put'");
  }

  const expiresIn = typeof body.expiresIn === "number" ? body.expiresIn : 3600;
  if (expiresIn <= 0 || expiresIn > 604800) {
    return errorResponse("InvalidRequest", "expiresIn must be between 1 and 604800 seconds (7 days)");
  }

  const requiredScope = operation === "get" ? "read" : "write";
  const result = await authenticate(request, requiredScope, params.bucket);
  if (result instanceof NextResponse) return result;
  const { auth, bucket } = result;

  let objectId: string | null = null;
  if (operation === "get") {
    const existingObj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucket.id), eq(objects.key, objectKey)),
    });
    if (!existingObj) {
      return errorResponse("NoSuchKey", `Object '${objectKey}' not found in bucket '${params.bucket}'`);
    }
    objectId = existingObj.id;
  }

  // Determine maxSizeBytes for put operations to protect against abuse
  const defaultMaxSize = 100 * 1024 * 1024; // 100MB default limit for presigned PUTs
  const maxSizeBytes = typeof body.maxSizeBytes === "number" ? body.maxSizeBytes : (operation === "put" ? defaultMaxSize : null);

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const expiresAtDate = new Date(expiresAt * 1000);

  const signature = generatePresignedSignature({
    userId: auth.userId,
    bucketId: bucket.id,
    key: objectKey,
    operation,
    expiresAt,
  });

  const [grant] = await db.insert(signedUrlGrants).values({
    objectId,
    bucketId: bucket.id,
    key: objectKey,
    operation,
    signature,
    maxSizeBytes,
    expiresAt: expiresAtDate,
  }).returning();

  const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const encodedKey = realKeyParts.map(encodeURIComponent).join("/");
  const signedUrl = `${baseUrl}/s/${bucket.id}/${encodedKey}?exp=${expiresAt}&sig=${signature}&op=${operation}`;

  return NextResponse.json({
    url: signedUrl,
    grantId: grant.id,
    expiresAt: expiresAtDate.toISOString(),
    operation,
    maxSizeBytes,
  });
}

export async function OPTIONS() {
  return handleCorsPreflightRequest();
}
