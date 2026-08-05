import { NextResponse, NextRequest } from "next/server";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-user-id, x-byos-version, x-byos-hash",
  "Access-Control-Max-Age": "86400",
};

/**
 * Handles CORS OPTIONS preflight requests for API routes.
 */
export function handleCorsPreflightRequest(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Attaches standard CORS headers to an outgoing API response.
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, val]) => {
    response.headers.set(key, val);
  });
  return response;
}
