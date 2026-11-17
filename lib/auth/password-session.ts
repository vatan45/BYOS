import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";

export const SESSION_COOKIE = "byos_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
const globalAuth = globalThis as unknown as {
  authSql?: ReturnType<typeof postgres>;
};
function sql() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for account login.");
  return (globalAuth.authSql ??= postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  }));
}
export const digestToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function validCredentials(
  email: unknown,
  password: unknown
): email is string {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password) <= 72
  );
}
export async function authenticate(
  email: string,
  password: string,
  signup: boolean
) {
  const db = sql();
  // Shared across instances; limit attempts for this account to ten per 15 minutes.
  const key = digestToken(email);
  const [attempt] =
    await db`INSERT INTO auth_attempts (key, count, expires_at) VALUES (${key}, 1, now() + interval '15 minutes') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN auth_attempts.expires_at < now() THEN 1 ELSE auth_attempts.count + 1 END, expires_at = CASE WHEN auth_attempts.expires_at < now() THEN now() + interval '15 minutes' ELSE auth_attempts.expires_at END RETURNING count`;
  if (attempt.count > 10)
    return {
      error: "Too many attempts. Try again in 15 minutes.",
      status: 429,
    };
  let id: string;
  if (signup) {
    const [existing] = await db`SELECT id FROM users WHERE lower(email) = ${email}`;
    if (existing) return { error: "Unable to create this account. Try signing in instead.", status: 409 };
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.begin(async (tx) => {
      const [user] =
        await tx`INSERT INTO users (email, plan) VALUES (${email}, 'free') ON CONFLICT (email) DO NOTHING RETURNING id`;
      if (!user) return null;
      await tx`INSERT INTO password_credentials (user_id, password_hash) VALUES (${user.id}, ${passwordHash})`;
      return user.id as string;
    });
    if (!result)
      return {
        error: "Unable to create this account. Try signing in instead.",
        status: 409,
      };
    id = result;
  } else {
    const [user] =
      await db`SELECT u.id, c.password_hash FROM users u JOIN password_credentials c ON c.user_id = u.id WHERE lower(u.email) = ${email}`;
    // A real hash calculation also occurs for unknown accounts.
    const valid = await bcrypt.compare(
      password,
      user?.password_hash ??
        "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"
    );
    if (!user || !valid)
      return { error: "Email or password is incorrect.", status: 401 };
    id = user.id;
  }
  const token = randomBytes(32).toString("hex");
  await db`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (${digestToken(token)}, ${id}, ${new Date(Date.now() + SESSION_SECONDS * 1000)})`;
  return { token };
}
export async function readSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] =
    await sql()`SELECT u.id, u.email, u.plan FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${digestToken(token)} AND s.expires_at > now()`;
  return user
    ? {
        id: user.id as string,
        email: user.email as string,
        plan: user.plan as string,
      }
    : null;
}
export async function revokeSession(token?: string) {
  if (token)
    await sql()`DELETE FROM auth_sessions WHERE token_hash = ${digestToken(token)}`;
}
