import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { storageConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/auth/encryption";
import { getDashboardSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionUser = await getDashboardSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = sessionUser.id;

  const connection = await db.query.storageConnections.findFirst({
    where: and(
      eq(storageConnections.userId, userId),
      eq(storageConnections.provider, "google_drive")
    ),
  });

  if (!connection) {
    return NextResponse.json({ error: "No connection found" }, { status: 404 });
  }

  try {
    const accessToken = decrypt(connection.accessTokenEncrypted);
    
    // Revoke token with Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (err) {
    console.error("Failed to revoke token with Google", err);
    // Continue and mark revoked in our DB anyway
  }

  await db.update(storageConnections)
    .set({ status: "revoked" })
    .where(eq(storageConnections.id, connection.id));

  return NextResponse.json({ success: true, message: "Disconnected successfully" });
}
