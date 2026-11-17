import { it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({
  authenticate: vi.fn(),
  readSession: vi.fn(),
  revokeSession: vi.fn(),
}));
vi.mock("@/lib/auth/password-session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/auth/password-session")>()),
  ...auth,
}));
import { POST, GET } from "../../app/api/auth/account/route";
function request(body: object, origin = "http://localhost") {
  return new NextRequest("http://localhost/api/auth/account", {
    method: "POST",
    headers: {
      origin,
      "Content-Type": "application/json",
      cookie: "byos_session=token",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => vi.clearAllMocks());
it("creates a protected cookie after successful signup", async () => {
  auth.authenticate.mockResolvedValue({ token: "a".repeat(64) });
  const response = await POST(
    request({
      action: "signup",
      email: " User@example.com ",
      password: "password123",
    })
  );
  expect(auth.authenticate).toHaveBeenCalledWith(
    "user@example.com",
    "password123",
    true
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
});
it("rejects incorrect passwords without issuing cookies", async () => {
  auth.authenticate.mockResolvedValue({
    error: "Email or password is incorrect.",
    status: 401,
  });
  const response = await POST(
    request({
      action: "login",
      email: "user@example.com",
      password: "wrongpass",
    })
  );
  expect(response.status).toBe(401);
  expect(response.headers.get("set-cookie")).toBeNull();
});
it("rejects cross-origin authentication", async () => {
  expect(
    (await POST(request({ action: "logout" }, "https://attacker.example")))
      .status
  ).toBe(403);
  expect(auth.revokeSession).not.toHaveBeenCalled();
});
it("revokes the server session on logout", async () => {
  const response = await POST(request({ action: "logout" }));
  expect(auth.revokeSession).toHaveBeenCalledWith("token");
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
it("does not return a user for an expired session", async () => {
  auth.readSession.mockResolvedValue(null);
  expect(
    (await GET(new NextRequest("http://localhost/api/auth/account"))).status
  ).toBe(401);
});
it("rejects passwords bcrypt would truncate", async () => {
  expect(
    (
      await POST(
        request({
          action: "signup",
          email: "user@example.com",
          password: "a".repeat(73),
        })
      )
    ).status
  ).toBe(400);
  expect(auth.authenticate).not.toHaveBeenCalled();
});
