import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/auth/jwt";
import { encrypt } from "@/lib/auth/encryption";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { storageConnections, buckets, users } from "@/lib/db/schema";
import { google } from "googleapis";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error === "access_denied") {
    return NextResponse.redirect(new URL("/dashboard?error=access_denied", env.NEXT_PUBLIC_APP_URL));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_request", env.NEXT_PUBLIC_APP_URL));
  }

  let statePayload;
  try {
    statePayload = verifyOAuthState(state);
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", env.NEXT_PUBLIC_APP_URL));
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const providerAccountEmail = userInfo.data.email || "unknown@google.com";

    const accessTokenEncrypted = encrypt(tokens.access_token!);
    const refreshTokenEncrypted = encrypt(tokens.refresh_token || "");
    const tokenExpiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

    // Ensure user exists in database before creating foreign key connection record
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, statePayload.userId),
    });

    if (!existingUser) {
      try {
        await db.insert(users).values({
          id: statePayload.userId,
          email: providerAccountEmail || "user@domain.com",
          plan: "free",
        });
      } catch (insertErr) {
        // Ignore potential concurrency insert conflicts
        console.warn("User seeding concurrency notice in OAuth callback:", insertErr);
      }
    }

    // Upsert connection
    let [connection] = await db
      .select()
      .from(storageConnections)
      .where(
        and(
          eq(storageConnections.userId, statePayload.userId),
          eq(storageConnections.provider, "google_drive")
        )
      );

    if (connection) {
      [connection] = await db
        .update(storageConnections)
        .set({
          accessTokenEncrypted,
          refreshTokenEncrypted: tokens.refresh_token ? refreshTokenEncrypted : connection.refreshTokenEncrypted,
          tokenExpiresAt,
          providerAccountEmail,
          status: "active",
        })
        .where(eq(storageConnections.id, connection.id))
        .returning();
    } else {
      [connection] = await db
        .insert(storageConnections)
        .values({
          userId: statePayload.userId,
          provider: "google_drive",
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          providerAccountEmail,
          status: "active",
        })
        .returning();
    }

    // Drive Folder Setup
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    
    // Check if BYOS folder exists (since we only have drive.file, we can only see folders we created)
    let folderId: string | null = null;
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name='BYOS' and trashed=false",
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      folderId = res.data.files[0].id!;
    } else {
      // Create new folder
      const folderRes = await drive.files.create({
        requestBody: {
          name: "BYOS",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = folderRes.data.id!;
    }

    // Create a default bucket if not exists
    const existingBucket = await db.query.buckets.findFirst({
      where: (buckets, { and, eq }) => 
        and(eq(buckets.userId, statePayload.userId), eq(buckets.name, "default"))
    });

    if (!existingBucket) {
      await db.insert(buckets).values({
        userId: statePayload.userId,
        connectionId: connection.id,
        name: "default",
        providerFolderId: folderId,
      });
    }

    return NextResponse.redirect(new URL("/dashboard?connected=true", env.NEXT_PUBLIC_APP_URL));
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.redirect(new URL("/dashboard?error=auth_failed", env.NEXT_PUBLIC_APP_URL));
  }
}
