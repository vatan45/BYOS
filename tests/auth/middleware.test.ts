import { it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
afterEach(() => vi.unstubAllGlobals());
it("protects the console without a session", async () => {
  const response = await middleware(
    new NextRequest("http://localhost/dashboard")
  );
  expect(response.headers.get("location")).toBe("http://localhost/login");
});
it("rejects an invalid session even if a cookie is present", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 401 }))
  );
  const response = await middleware(
    new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "byos_session=invalid" },
    })
  );
  expect(response.headers.get("location")).toBe("http://localhost/login");
});
it("allows a server-validated session", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  );
  const response = await middleware(
    new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "byos_session=valid" },
    })
  );
  expect(response.headers.get("location")).toBeNull();
});
