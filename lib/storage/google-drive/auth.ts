import { google } from "googleapis";
import { db } from "@/lib/db/client";
import { storageConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/auth/encryption";
import { env } from "@/lib/env";

export async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await db.query.storageConnections.findFirst({
    where: eq(storageConnections.id, connectionId),
  });

  if (!connection) throw new Error("Connection not found");
  if (connection.status !== "active") throw new Error(`Connection is ${connection.status}`);

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET
  );

  const accessToken = decrypt(connection.accessTokenEncrypted);
  const refreshToken = decrypt(connection.refreshTokenEncrypted);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.tokenExpiresAt.getTime(),
  });

  // Check if token expires in less than 5 minutes
  if (connection.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      const newAccessTokenEncrypted = encrypt(credentials.access_token!);
      const newRefreshTokenEncrypted = credentials.refresh_token 
        ? encrypt(credentials.refresh_token) 
        : connection.refreshTokenEncrypted;
      
      await db.update(storageConnections)
        .set({
          accessTokenEncrypted: newAccessTokenEncrypted,
          refreshTokenEncrypted: newRefreshTokenEncrypted,
          tokenExpiresAt: new Date(credentials.expiry_date!),
        })
        .where(eq(storageConnections.id, connectionId));
        
      return credentials.access_token!;
    } catch {
      // Mark as error if refresh fails (e.g. revoked manually by user in Google account)
      await db.update(storageConnections)
        .set({ status: "error" })
        .where(eq(storageConnections.id, connectionId));
        
      throw new Error("Failed to refresh access token");
    }
  }

  return accessToken;
}
