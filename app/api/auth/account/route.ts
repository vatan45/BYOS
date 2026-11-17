import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  readSession,
  revokeSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
  validCredentials,
} from "@/lib/auth/password-session";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
    return NextResponse.json(
      { user },
      { status: user ? 200 : 401, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Account database is unavailable." },
      { status: 503 }
    );
  }
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [new URL(request.url).origin];
  if (process.env.NEXT_PUBLIC_APP_URL)
    allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  if (!origin || !allowedOrigins.includes(origin))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  try {
    const body = await request.json();
    if (body.action === "logout") {
      await revokeSession(request.cookies.get(SESSION_COOKIE)?.value);
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (body.action !== "login" && body.action !== "signup")
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : body.email;
    if (!validCredentials(email, body.password))
      return NextResponse.json(
        {
          error:
            "Enter a valid email and a password of at least 8 characters (maximum 72 bytes).",
        },
        { status: 400 }
      );
    const result = await authenticate(
      email,
      body.password,
      body.action === "signup"
    );
    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "Account service is unavailable. Check DATABASE_URL and apply the account migration.",
      },
      { status: 503 }
    );
  }
}
