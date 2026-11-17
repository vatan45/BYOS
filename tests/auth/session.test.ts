import { it, expect, vi, afterEach } from "vitest";
vi.mock("@/lib/auth/password-session", () => ({
  readSession: async () => null,
  SESSION_COOKIE: "byos_session",
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: {
        findFirst: async () => ({
          id: "victim",
          email: "victim@example.com",
          plan: "pro",
        }),
      },
    },
  },
}));
import { getDashboardSessionUser } from "../../lib/auth/session";
afterEach(() => vi.unstubAllEnvs());
it("rejects a caller-provided authentication bypass in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(
    await getDashboardSessionUser(
      new Request("http://localhost/api/v1/keys", {
        headers: { "x-byos-test-bypass": "1", "x-user-id": "victim" },
      })
    )
  ).toBeNull();
});
