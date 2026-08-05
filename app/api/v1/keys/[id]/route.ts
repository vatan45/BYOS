import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api/errors";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: { id: string };
}

/**
 * DELETE /api/v1/keys/{id}
 * Revokes an API key by setting revoked_at timestamp.
 * Retains record in database for usage_logs audit trail preservation.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized session");
  }

  try {
    const apiKey = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, params.id), eq(apiKeys.userId, user.id)),
    });

    if (!apiKey) {
      return errorResponse("InvalidRequest", "API key not found or access denied");
    }

    if (apiKey.revokedAt) {
      return NextResponse.json(
        { success: true, id: apiKey.id, status: "already_revoked" },
        { status: 200 }
      );
    }

    const now = new Date();
    await db
      .update(apiKeys)
      .set({ revokedAt: now })
      .where(eq(apiKeys.id, apiKey.id));

    return NextResponse.json(
      { success: true, id: apiKey.id, revokedAt: now },
      { status: 200 }
    );
  } catch (err) {
    console.error("[RevokeKey] Error:", err);
    return errorResponse("InternalError", "Failed to revoke API key");
  }
}
