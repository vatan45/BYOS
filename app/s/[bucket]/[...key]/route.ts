import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buckets, signedUrlGrants } from "@/lib/db/schema";
import { verifyPresignedSignature, createByteLimitTransformStream } from "@/lib/storage/presigned-urls";
import { getProvider } from "@/lib/api/resolve-provider";
import { logUsage } from "@/lib/api/usage-logger";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: { bucket: string; key: string[] };
}

function getObjectKey(keyParts: string[]): string {
  return keyParts.map(decodeURIComponent).join("/");
}

/**
 * ARCHITECTURAL DECISION (MVP vs Future Optimization):
 * ---------------------------------------------------
 * Real S3 presigned GET requests for large public files sometimes issue an HTTP 302/307 redirect directly
 * to the underlying storage backend (like CDN or raw S3 URL) rather than proxying bytes through a middleware application server.
 *
 * For our MVP, we consciously PROXY all file bytes directly through our Next.js application server.
 * Rationale:
 * 1. Google Drive files are accessible only via private OAuth bearer tokens belonging to the developer's connected Google account.
 *    We cannot expose these OAuth tokens or refresh credentials to end-users directly in redirect URLs.
 * 2. Drive's filesystem is hierarchical (IDs and folder parents) rather than S3-style flat key strings. Proxying allows our
 *    provider engine to resolve path maps cleanly on the fly without leaking internal Drive folder IDs or needing public link permissions.
 *
 * Future Optimization:
 * For publicly shareable files, a background worker or read-through cache could alter Drive permissions to generate a temporary
 * `webContentLink` or read-only preview URL directly on Google Drive, allowing our server to simply return an HTTP 307 Temporary Redirect.
 * This would bypass our application server entirely for egress bandwidth, massively cutting hosting egress costs at scale.
 */

async function validateSignedRequest(
  request: NextRequest,
  expectedOp: "get" | "put",
  params: RouteParams["params"]
) {
  const { searchParams } = new URL(request.url);
  const sig = searchParams.get("sig");
  const exp = searchParams.get("exp");
  const op = searchParams.get("op");

  if (!sig || !exp || !op) {
    return { error: "Missing required presigned query parameters (sig, exp, op)", status: 400 };
  }

  if (op !== expectedOp) {
    return { error: `Operation mismatch: this URL was signed for '${op}', not '${expectedOp}'`, status: 403 };
  }

  const expiresAt = parseInt(exp, 10);
  if (isNaN(expiresAt) || expiresAt * 1000 < Date.now()) {
    return { error: "Presigned URL has expired", status: 403 };
  }

  const objectKey = getObjectKey(params.key);

  // Lookup bucket primarily by ID, falling back to name
  let bucket = await db.query.buckets.findFirst({
    where: eq(buckets.id, params.bucket),
  });
  if (!bucket) {
    bucket = await db.query.buckets.findFirst({
      where: eq(buckets.name, params.bucket),
    });
  }

  if (!bucket) {
    return { error: "Bucket not found or invalid", status: 404 };
  }

  // Verify HMAC signature using timing-safe comparisons
  const isValid = verifyPresignedSignature({
    userId: bucket.userId,
    bucketId: bucket.id,
    key: objectKey,
    operation: expectedOp,
    expiresAt,
    signature: sig,
  });

  if (!isValid) {
    return { error: "Invalid or tampered signature", status: 403 };
  }

  // Check database revocation status and fetch constraints
  const grant = await db.query.signedUrlGrants.findFirst({
    where: eq(signedUrlGrants.signature, sig),
  });

  if (grant?.revoked) {
    return { error: "This presigned URL grant has been explicitly revoked", status: 403 };
  }

  return { bucket, grant, objectKey };
}

/**
 * GET /app/s/[bucket]/[...key]
 * Public presigned download handler. Trusts signature parameter in query string.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const validation = await validateSignedRequest(request, "get", params);
  if ("error" in validation) {
    return NextResponse.json({ error: { code: "AccessDenied", message: validation.error } }, { status: validation.status });
  }
  const { bucket, objectKey } = validation;

  try {
    const provider = getProvider(bucket.connectionId);
    let metadata;
    try {
      metadata = await provider.getObjectMetadata(bucket.id, objectKey);
    } catch {
      return NextResponse.json({ error: { code: "NoSuchKey", message: `Object '${objectKey}' not found` } }, { status: 404 });
    }

    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : metadata.size - 1;
        const contentLength = end - start + 1;

        const stream = await provider.downloadObject(bucket.id, objectKey);

        logUsage({
          userId: bucket.userId,
          bucketId: bucket.id,
          apiKeyId: null,
          operation: "download",
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

    const stream = await provider.downloadObject(bucket.id, objectKey);

    logUsage({
      userId: bucket.userId,
      bucketId: bucket.id,
      apiKeyId: null,
      operation: "download",
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
    console.error("[SignedGET] Error:", err);
    return NextResponse.json({ error: { code: "InternalError", message: "Failed to stream presigned file download" } }, { status: 500 });
  }
}

/**
 * PUT /app/s/[bucket]/[...key]
 * Public presigned upload handler. Enforces maxSizeBytes established at signing time.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const validation = await validateSignedRequest(request, "put", params);
  if ("error" in validation) {
    return NextResponse.json({ error: { code: "AccessDenied", message: validation.error } }, { status: validation.status });
  }
  const { bucket, grant, objectKey } = validation;

  try {
    if (!request.body) {
      return NextResponse.json({ error: { code: "InvalidRequest", message: "Missing upload request body" } }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const contentLength = request.headers.get("content-length");

    if (contentLength && grant && grant.maxSizeBytes && parseInt(contentLength, 10) > grant.maxSizeBytes) {
      return NextResponse.json(
        { error: { code: "EntityTooLarge", message: `File size (${contentLength} bytes) exceeds maximum permitted limit (${grant.maxSizeBytes} bytes)` } },
        { status: 400 }
      );
    }

    let uploadStream: ReadableStream = request.body;
    if (grant && grant.maxSizeBytes) {
      uploadStream = request.body.pipeThrough(createByteLimitTransformStream(grant.maxSizeBytes));
    }

    const provider = getProvider(bucket.connectionId);
    const obj = await provider.uploadObject(bucket.id, objectKey, uploadStream, {
      contentType,
    });

    logUsage({
      userId: bucket.userId,
      bucketId: bucket.id,
      apiKeyId: null,
      operation: "upload",
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
  } catch (err: unknown) {
    console.error("[SignedPUT] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload presigned file";
    const isSizeError = message.includes("exceeds maximum permitted");
    return NextResponse.json(
      { error: { code: isSizeError ? "EntityTooLarge" : "InternalError", message } },
      { status: isSizeError ? 400 : 500 }
    );
  }
}
