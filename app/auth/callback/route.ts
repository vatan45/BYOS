import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Old provider bookmarks no longer initiate Supabase requests.
export async function GET(request: Request) {
 return NextResponse.redirect(new URL("/login", request.url));
}
