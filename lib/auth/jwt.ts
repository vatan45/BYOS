import jwt from "jsonwebtoken";
import { env } from "../env";

export interface OAuthStatePayload {
  userId: string;
  provider: string;
  nonce: string;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  return jwt.verify(token, env.JWT_SECRET) as OAuthStatePayload;
}
