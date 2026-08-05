import { NextRequest, NextResponse } from "next/server";
import { validateApiOrDashboardAuth } from "@/lib/auth/api-key-middleware";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getPlanLimits } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { db } from "@/lib/db/client";
import { buckets, signedUrlGrants, objects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: { grantId: string };
}

/**
 * POST /api/v1/signed-urls/{grantId}/revoke
 * Instantly revokes an active presigned URL grant so future requests are rejected.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await validateApiOrDashboardAuth(request);
  if (typeof auth === "string") {
    return errorResponse("InvalidApiKey", auth);
  }

  const rateLimited = await checkRateLimit(auth.apiKeyId, getPlanLimits(auth.plan).rateLimitReqPerMin);
  if (rateLimited) return rateLimited;

  const grant = await db.query.signedUrlGrants.findFirst({
    where: eq(signedUrlGrants.id, params.grantId),
  });

  if (!grant) {
    return errorResponse("InvalidRequest", `Signed URL grant '${params.grantId}' not found`);
  }

  // Verify ownership of the associated bucket or object
  let bucketId = grant.bucketId;
  if (!bucketId && grant.objectId) {
    const obj = await db.query.objects.findFirst({
      where: eq(objects.id, grant.objectId),
    });
    if (obj) {
      bucketId = obj.bucketId;
    }
  }

  if (!bucketId) {
    return errorResponse("AccessDenied", "Unable to establish bucket ownership for this grant");
  }

  const bucket = await db.query.buckets.findFirst({
    where: eq(buckets.id, bucketId),
  });

  if (!bucket || bucket.userId !== auth.userId) {
    return errorResponse("AccessDenied", "You do not have authorization to revoke this signed URL grant");
  }

  await db
    .update(signedUrlGrants)
    .set({ revoked: true })
    .where(eq(signedUrlGrants.id, grant.id));

  return NextResponse.json({
    success: true,
    grantId: grant.id,
    revoked: true,
  });
}
