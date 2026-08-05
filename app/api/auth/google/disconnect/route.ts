import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { storageConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/auth/encryption";

export async function POST(request: Request) {
  // In a real app, verify the user session. 
  // For MVP, we'll accept userId from body.
  let userId: string;
  try {
    const body = await request.json();
    userId = body.userId || "00000000-0000-0000-0000-000000000000";
  } catch {
    userId = "00000000-0000-0000-0000-000000000000";
  }

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
