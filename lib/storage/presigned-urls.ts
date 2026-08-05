import crypto from "crypto";
import { env } from "@/lib/env";

/**
 * Derives a dedicated signing secret for an individual user/account using HMAC-SHA256
 * keyed by the root ENCRYPTION_KEY.
 */
export function deriveAccountSecret(userId: string): Buffer {
  return crypto
    .createHmac("sha256", env.ENCRYPTION_KEY)
    .update(`byos:account_secret:${userId}`)
    .digest();
}

export interface SignParams {
  userId: string;
  bucketId: string;
  key: string;
  operation: "get" | "put";
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * Computes an HMAC-SHA256 signature over {bucketId}:{key}:{operation}:{expiresAt}
 * encoded as base64url.
 */
export function generatePresignedSignature(params: SignParams): string {
  const secret = deriveAccountSecret(params.userId);
  const payload = `${params.bucketId}:${params.key}:${params.operation}:${params.expiresAt}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export interface VerifyParams extends SignParams {
  signature: string;
}

/**
 * Timing-safe signature verification to prevent timing side-channel attacks.
 * Returns true if valid, false if invalid or tampered.
 */
export function verifyPresignedSignature(params: VerifyParams): boolean {
  try {
    const expectedSignature = generatePresignedSignature(params);
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const providedBuffer = Buffer.from(params.signature, "utf8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * Creates a standard Web API TransformStream that monitors and restricts the volume of passing bytes.
 * Throws an explicit error if the transmitted bytes exceed `maxSizeBytes`.
 */
export function createByteLimitTransformStream(
  maxSizeBytes: number
): TransformStream<Uint8Array, Uint8Array> {
  let bytesReceived = 0;
  return new TransformStream({
    transform(chunk, controller) {
      bytesReceived += chunk.byteLength;
      if (bytesReceived > maxSizeBytes) {
        controller.error(
          new Error(
            `Payload size (${bytesReceived} bytes) exceeds maximum permitted upload limit (${maxSizeBytes} bytes)`
          )
        );
        return;
      }
      controller.enqueue(chunk);
    },
  });
}
