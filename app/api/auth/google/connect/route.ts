import { NextResponse } from "next/server";
import { signOAuthState } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { getDashboardSessionUser } from "@/lib/auth/session";
import crypto from "crypto";

export async function GET(request: Request) {
  const sessionUser = await getDashboardSessionUser(request);
  const userId = sessionUser ? sessionUser.id : "00000000-0000-0000-0000-000000000000";

  const statePayload = {
    userId,
    provider: "google_drive",
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const state = signOAuthState(statePayload);

  // We request ONLY the drive.file scope for security/trust
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email"
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
