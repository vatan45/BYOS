import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  if (!request.cookies.get("byos_session"))
    return NextResponse.redirect(new URL("/login", request.url));
  try {
    const response = await fetch(new URL("/api/auth/account", request.url), {
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    if (response.ok) return NextResponse.next();
  } catch {
    /* Fail closed if session validation is unavailable. */
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/objects/:path*",
    "/keys/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/playground/:path*",
    "/admin/:path*",
    "/docs/:path*",
  ],
};
