import { it, expect } from "vitest";
import { GET } from "../../app/auth/callback/route";
it("sends old Supabase callbacks to the new login", async () => {
  const response = await GET(
    new Request("https://byos.example/auth/callback?code=old")
  );
  expect(response.headers.get("location")).toBe("https://byos.example/login");
});
