import { NextResponse } from "next/server";

export type ErrorCode =
  | "NoSuchKey"
  | "NoSuchBucket"
  | "AccessDenied"
  | "InvalidRequest"
  | "InvalidApiKey"
  | "RateLimitExceeded"
  | "InternalError"
  | "MethodNotAllowed"
  | "MissingScope"
  | "NoSuchVersion"
  | "InsufficientStorage";

const STATUS_MAP: Record<ErrorCode, number> = {
  NoSuchKey: 404,
  NoSuchBucket: 404,
  AccessDenied: 403,
  InvalidRequest: 400,
  InvalidApiKey: 401,
  RateLimitExceeded: 429,
  InternalError: 500,
  MethodNotAllowed: 405,
  MissingScope: 403,
  NoSuchVersion: 404,
  InsufficientStorage: 507,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  const status = STATUS_MAP[code] || 500;
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status }
  );
}
