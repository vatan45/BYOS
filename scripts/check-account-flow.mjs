import nextEnv from "@next/env";
import postgres from "postgres";
import { randomBytes, createHash } from "node:crypto";
import assert from "node:assert/strict";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.BYOS_TEST_ORIGIN || "http://localhost:3000";
const email = `byos-check-${randomBytes(8).toString("hex")}@example.invalid`;
const password = randomBytes(20).toString("hex");
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
let cookie;
async function post(action, credentials = true) {
  return fetch(`${base}/api/auth/account`, {
    method: "POST",
    headers: {
      origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({
      action,
      ...(credentials ? { email, password } : {}),
    }),
  });
}
try {
  let response = await post("signup");
  assert.equal(
    response.status,
    200,
    `Signup returned ${response.status}: ${await response.text()}`
  );
  cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  response = await fetch(`${base}/api/auth/account`, { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.email, email);
  console.log("PASS registration and session validation");
  response = await fetch(`${base}/dashboard`, {
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(response.status, 200);
  response = await fetch(`${base}/api/v1/dashboard/overview`, {
    headers: { cookie },
  });
  assert.equal(response.status, 200, `Overview returned ${response.status}`);
  console.log("PASS protected dashboard and workspace overview");
  response = await post("logout", false);
  assert.equal(response.status, 200);
  response = await fetch(`${base}/api/auth/account`, { headers: { cookie } });
  assert.equal(response.status, 401);
  response = await fetch(`${base}/dashboard`, {
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(response.status, 307);
  console.log("PASS logout revocation and rejected old session");
  response = await post("login");
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie")?.split(";")[0];
  response = await fetch(`${base}/api/auth/account`, { headers: { cookie } });
  assert.equal(response.status, 200);
  console.log("PASS password login");
  response = await fetch(`${base}/api/auth/account`, {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      email,
      password: "incorrect-password",
    }),
  });
  assert.equal(response.status, 401);
  console.log("PASS incorrect password rejected");
} finally {
  // Delete only the synthetic account created by this run, including its cascading sessions.
  await db`DELETE FROM users WHERE email = ${email}`;
  const key = createHash("sha256").update(email).digest("hex");
  await db`DELETE FROM auth_attempts WHERE key = ${key}`;
  await db.end();
}
