import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { buckets, storageConnections, objects } from "@/lib/db/schema";
import { getDashboardSessionUser } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/auth/plans";
import { errorResponse } from "@/lib/api/errors";
import { eq, and, desc } from "drizzle-orm";
import { google } from "googleapis";
import { env } from "@/lib/env";
import { getValidAccessToken } from "@/lib/storage/google-drive/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/buckets
 * Lists all storage buckets for the currently authenticated developer session.
 */
export async function GET(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized dashboard session");
  }

  try {
    const userBuckets = await db.query.buckets.findMany({
      where: eq(buckets.userId, user.id),
      orderBy: [desc(buckets.createdAt)],
    });

    const enriched = await Promise.all(
      userBuckets.map(async (b) => {
        const bucketObjects = await db.query.objects.findMany({
          where: eq(objects.bucketId, b.id),
        });
        const sizeBytes = bucketObjects.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
        return {
          id: b.id,
          name: b.name,
          providerFolderId: b.providerFolderId,
          objectCount: bucketObjects.length,
          sizeBytes,
          createdAt: b.createdAt,
        };
      })
    );

    return NextResponse.json({ buckets: enriched });
  } catch (err) {
    console.error("[ListBuckets] Error:", err);
    return errorResponse("InternalError", "Failed to list buckets");
  }
}

/**
 * POST /api/v1/buckets
 * Creates a new storage bucket backed by an isolated folder in the user's connected Google Drive.
 */
export async function POST(request: NextRequest) {
  const user = await getDashboardSessionUser(request);
  if (!user) {
    return errorResponse("InvalidApiKey", "Unauthorized dashboard session");
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().toLowerCase() : "";

    if (!name || !/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(name)) {
      return errorResponse(
        "InvalidRequest",
        "Bucket name must be between 3 and 63 lowercase alphanumeric characters or hyphens, and cannot start/end with a hyphen."
      );
    }

    const limits = getPlanLimits(user.plan);
    const userBuckets = await db.query.buckets.findMany({
      where: eq(buckets.userId, user.id),
    });

    if (userBuckets.length >= limits.maxBuckets) {
      return errorResponse(
        "InsufficientStorage",
        `Bucket limit reached (${limits.maxBuckets}) for your ${user.plan.toUpperCase()} plan. Please upgrade to PRO for unlimited buckets.`
      );
    }

    const existingName = userBuckets.find((b) => b.name === name);
    if (existingName) {
      return errorResponse("InvalidRequest", `Bucket '${name}' already exists in your account.`);
    }

    const connection = await db.query.storageConnections.findFirst({
      where: and(
        eq(storageConnections.userId, user.id),
        eq(storageConnections.status, "active")
      ),
      orderBy: [desc(storageConnections.createdAt)],
    });

    if (!connection) {
      return errorResponse(
        "InvalidRequest",
        "No active Google Drive connection found. Please connect your Google Drive account before creating buckets."
      );
    }

    let folderId = "";
    try {
      const accessToken = await getValidAccessToken(connection.id);
      const oauth2Client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
      oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const folderRes = await drive.files.create({
        requestBody: {
          name: `BYOS - ${name}`,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = folderRes.data.id || `local-folder-${Date.now()}`;
    } catch (apiErr: any) {
      console.error("[CreateBucket] Google Drive API error during folder creation:", apiErr);
      return errorResponse(
        "InternalError",
        "Failed to communicate with Google Drive API to provision bucket folder."
      );
    }

    const [created] = await db
      .insert(buckets)
      .values({
        userId: user.id,
        connectionId: connection.id,
        name,
        providerFolderId: folderId,
      })
      .returning();

    return NextResponse.json({
      id: created.id,
      name: created.name,
      providerFolderId: created.providerFolderId,
      objectCount: 0,
      sizeBytes: 0,
      createdAt: created.createdAt,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[CreateBucket] Error:", err);
    return errorResponse("InternalError", "An unexpected error occurred while creating bucket");
  }
}
