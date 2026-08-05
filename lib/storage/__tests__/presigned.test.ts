import { describe, it, expect, vi } from "vitest";

// Mock env before importing presigned-urls module
vi.mock("@/lib/env", () => ({
  env: {
    ENCRYPTION_KEY: "a]very-secret-encryption-key-32c-for-testing-hmac-operations",
  },
}));

import {
  generatePresignedSignature,
  verifyPresignedSignature,
  createByteLimitTransformStream,
} from "../presigned-urls";

describe("Presigned URL Cryptography & Security", () => {
  const baseParams = {
    userId: "user-123-abc",
    bucketId: "bucket-789-xyz",
    key: "private/docs/secret.pdf",
    operation: "get" as const,
    expiresAt: 1800000000,
  };

  it("should generate a valid HMAC base64url signature and successfully verify it", () => {
    const signature = generatePresignedSignature(baseParams);
    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(10);

    const isValid = verifyPresignedSignature({
      ...baseParams,
      signature,
    });
    expect(isValid).toBe(true);
  });

  it("should return false if the signature string is tampered with", () => {
    const validSig = generatePresignedSignature(baseParams);
    const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith("A") ? "B" : "A");

    const isValid = verifyPresignedSignature({
      ...baseParams,
      signature: tamperedSig,
    });
    expect(isValid).toBe(false);
  });

  it("should return false if the object key is altered (tampering protection)", () => {
    const signature = generatePresignedSignature(baseParams);

    const isValid = verifyPresignedSignature({
      ...baseParams,
      key: "private/docs/other-user-secret.pdf",
      signature,
    });
    expect(isValid).toBe(false);
  });

  it("should return false if operation type is altered from get to put", () => {
    const signature = generatePresignedSignature(baseParams);

    const isValid = verifyPresignedSignature({
      ...baseParams,
      operation: "put" as const,
      signature,
    });
    expect(isValid).toBe(false);
  });

  it("should return false if expiry timestamp is extended without authorization", () => {
    const signature = generatePresignedSignature(baseParams);

    const isValid = verifyPresignedSignature({
      ...baseParams,
      expiresAt: baseParams.expiresAt + 3600, // Attempting to extend by 1 hour
      signature,
    });
    expect(isValid).toBe(false);
  });
});

describe("Byte Limit TransformStream (Abuse Prevention)", () => {
  function createReadableStream(data: Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        data.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    });
  }

  async function consumeStream(stream: ReadableStream): Promise<number> {
    const reader = stream.getReader();
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) totalBytes += value.byteLength;
    }
    return totalBytes;
  }

  it("should successfully pass data when overall size is within maxSizeBytes limit", async () => {
    const chunk1 = new Uint8Array(500);
    const chunk2 = new Uint8Array(400);
    const input = createReadableStream([chunk1, chunk2]);

    const limitedStream = input.pipeThrough(createByteLimitTransformStream(1000));
    const bytesRead = await consumeStream(limitedStream);

    expect(bytesRead).toBe(900);
  });

  it("should throw an error and abort stream when byte count exceeds maxSizeBytes", async () => {
    const chunk1 = new Uint8Array(600);
    const chunk2 = new Uint8Array(500); // Exceeds 1000 limit
    const input = createReadableStream([chunk1, chunk2]);

    const limitedStream = input.pipeThrough(createByteLimitTransformStream(1000));

    await expect(consumeStream(limitedStream)).rejects.toThrow(/exceeds maximum permitted upload limit/);
  });
});
