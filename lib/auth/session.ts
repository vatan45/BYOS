import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "./password-session";

export interface SessionUser {
  id: string;
  email: string;
  plan: string;
}

const DEFAULT_MVP_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Resolves the authenticated session user for dashboard endpoints.
 * Authenticates opaque, revocable database sessions for isolated workspaces.
 * Only falls back to header/default ID in automated test runs.
 */
export async function getDashboardSessionUser(
  request: NextRequest | Request
): Promise<SessionUser | null> {
  try {
    const user = await readSession(cookies().get(SESSION_COOKIE)?.value);
    if (user) return user;
  } catch {
    /* Fail closed outside automated fixtures. */
  }

  // 2. Production Hardening: Never allow unauthenticated fallback to developer/test accounts in production
  if (process.env.NODE_ENV !== "test") {
    return null;
  }

  // 3. Fixture identities are available only during automated tests.
  const url = new URL(request.url, "http://localhost");
  const userIdFromHeader = request.headers.get("x-user-id");
  const userIdFromQuery = url.searchParams.get("userId");
  const targetUserId =
    userIdFromHeader || userIdFromQuery || DEFAULT_MVP_USER_ID;

  let user = await db.query.users.findFirst({
    where: eq(users.id, targetUserId),
  });

  if (!user && targetUserId === DEFAULT_MVP_USER_ID) {
    try {
      const [seeded] = await db
        .insert(users)
        .values({
          id: DEFAULT_MVP_USER_ID,
          email: "developer@byos.dev",
          plan: "pro",
        })
        .returning();
      if (seeded)
        return { id: seeded.id, email: seeded.email, plan: seeded.plan };
    } catch {
      user = await db.query.users.findFirst({
        where: eq(users.id, DEFAULT_MVP_USER_ID),
      });
    }
  }

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
  };
}
