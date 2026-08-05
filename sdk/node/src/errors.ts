/**
 * Base error class for all exceptions thrown by the BYOS SDK.
 */
export class BYOSError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "BYOS_ERROR",
    status?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BYOSError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an object, version, or bucket cannot be found (404 / NoSuchKey / NoSuchBucket).
 */
export class BYOSNotFoundError extends BYOSError {
  constructor(message: string, code = "NoSuchKey", status = 404, details?: Record<string, unknown>) {
    super(message, code, status, details);
    this.name = "BYOSNotFoundError";
  }
}

/**
 * Thrown when authentication fails or permissions/scopes are insufficient (401 / 403 / AccessDenied).
 */
export class BYOSAuthError extends BYOSError {
  constructor(message: string, code = "AccessDenied", status = 403, details?: Record<string, unknown>) {
    super(message, code, status, details);
    this.name = "BYOSAuthError";
  }
}

/**
 * Thrown when a storage quota or active key limit is exceeded (507 / InsufficientStorage).
 */
export class BYOSQuotaError extends BYOSError {
  constructor(
    message: string = "Storage quota exceeded for user plan",
    code = "InsufficientStorage",
    status = 507,
    details?: Record<string, unknown>
  ) {
    super(message, code, status, details);
    this.name = "BYOSQuotaError";
  }
}

/**
 * Thrown when rate limiting restricts request frequency (429 / RateLimitExceeded).
 */
export class BYOSRateLimitError extends BYOSError {
  readonly retryAfter?: number;

  constructor(
    message: string = "Rate limit exceeded",
    code = "RateLimitExceeded",
    status = 429,
    details?: Record<string, unknown> & { retryAfter?: number }
  ) {
    super(message, code, status, details);
    this.name = "BYOSRateLimitError";
    this.retryAfter = details?.retryAfter || 60;
  }
}

/**
 * Parses raw HTTP response error bodies and returns an instance of the most appropriate typed exception.
 */
export function createBYOSError(status: number, errBody: any): BYOSError {
  const code = errBody?.error?.code || errBody?.code || "UnknownError";
  const message = errBody?.error?.message || errBody?.message || `HTTP ${status} Error`;
  const details = errBody?.error ? { ...errBody.error, code: undefined, message: undefined } : undefined;

  if (status === 404 || code === "NoSuchKey" || code === "NoSuchBucket" || code === "NoSuchVersion") {
    return new BYOSNotFoundError(message, code, status, details);
  }

  if (status === 401 || status === 403 || code === "InvalidApiKey" || code === "AccessDenied" || code === "MissingScope") {
    return new BYOSAuthError(message, code, status, details);
  }

  if (status === 507 || code === "InsufficientStorage" || (typeof message === "string" && message.toLowerCase().includes("quota"))) {
    return new BYOSQuotaError(message, code, status, details);
  }

  if (status === 429 || code === "RateLimitExceeded") {
    return new BYOSRateLimitError(message, code, status, details);
  }

  return new BYOSError(message, code, status, details);
}
