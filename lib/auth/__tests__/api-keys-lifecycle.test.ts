/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    REDIS_URL: "",
  },
}));

// In-memory table stores for simulating actual SQLite/PostgreSQL interactions
let dbUsers: Record<string, unknown>[] = [];
let dbApiKeys: Record<string, unknown>[] = [];
let dbBuckets: Record<string, unknown>[] = [];
let dbObjects: Record<string, unknown>[] = [];

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => mockFindFirst("users", ...args) },
      apiKeys: {
        findFirst: (...args: unknown[]) => mockFindFirst("apiKeys", ...args),
        findMany: (...args: unknown[]) => mockFindMany("apiKeys", ...args),
      },
      buckets: {
        findFirst: (...args: unknown[]) => mockFindFirst("buckets", ...args),
        findMany: (...args: unknown[]) => mockFindMany("buckets", ...args),
      },
      objects: {
        findMany: (...args: unknown[]) => mockFindMany("objects", ...args),
      },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { POST as createKey } from "@/app/api/v1/keys/route";
import { DELETE as revokeKey } from "@/app/api/v1/keys/[id]/route";
import { validateApiKey, hasScope } from "@/lib/auth/api-key-middleware";
import { checkStorageQuota } from "@/lib/auth/plans";

describe("API Key Lifecycle & Quota Management", () => {
  const testUserId = "00000000-0000-0000-0000-000000000000";

  beforeEach(() => {
    vi.clearAllMocks();
    dbUsers = [{ id: testUserId, email: "developer@byos.dev", plan: "free" }];
    dbApiKeys = [];
    dbBuckets = [{ id: "bucket-1", userId: testUserId, name: "my-bucket", connectionId: "conn-1" }];
    dbObjects = [];

    mockFindFirst.mockImplementation((table: string) => {
      if (table === "users") return Promise.resolve(dbUsers[0] || null);
      if (table === "buckets") return Promise.resolve(dbBuckets[0] || null);
      if (table === "apiKeys") return Promise.resolve(dbApiKeys[0] || null);
      return Promise.resolve(null);
    });

    mockFindMany.mockImplementation((table: string, query?: any) => {
      if (table === "apiKeys") {
        if (query && query.where) {
          // Check if filtering by prefix
          return Promise.resolve(
            dbApiKeys.filter((k: any) => !k.revokedAt || query.where?.config ? true : !k.revokedAt)
          );
        }
        return Promise.resolve(dbApiKeys);
      }
      if (table === "buckets") return Promise.resolve(dbBuckets);
      if (table === "objects") return Promise.resolve(dbObjects);
      return Promise.resolve([]);
    });

    mockInsert.mockImplementation((table: any) => ({
      values: (val: any) => ({
        returning: () => {
          const record = { id: `key-${Date.now()}`, createdAt: new Date(), ...val };
          if (val.keyPrefix) {
            dbApiKeys.push(record);
          }
          return Promise.resolve([record]);
        },
      }),
    }));

    mockUpdate.mockImplementation(() => ({
      set: (updates: any) => ({
        where: () => {
          if (updates.revokedAt && dbApiKeys[0]) {
            (dbApiKeys[0] as any).revokedAt = updates.revokedAt;
          }
          return Promise.resolve();
        },
      }),
    }));
  });

  it("should generate a valid base62 secret key and store only bcrypt hash & prefix", async () => {
    const req = new NextRequest("http://localhost/api/v1/keys", {
      method: "POST",
      body: JSON.stringify({ name: "Read Only Token", scopes: ["read"] }),
    });

    const res = await createKey(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.key).toMatch(/^byos_live_[a-zA-Z0-9]+$/);
    expect(data.scopes).toEqual(["read"]);

    // Verify database record has no plaintext key
    expect(dbApiKeys[0]).toBeDefined();
    expect((dbApiKeys[0] as any).keyPrefix).toBe(data.key.slice(0, 18));
    expect((dbApiKeys[0] as any).keyHash).not.toBe(data.key);
    expect((dbApiKeys[0] as any).key).toBeUndefined();
  });

  it("should confirm a PUT (write operation) with a read-only key is rejected with 403", async () => {
    // 1. Create a read-only token
    const createReq = new NextRequest("http://localhost/api/v1/keys", {
      method: "POST",
      body: JSON.stringify({ name: "Read Only", scopes: ["read"] }),
    });
    const createRes = await createKey(createReq);
    const { key } = await createRes.json();

    // 2. Validate the token via middleware
    mockFindMany.mockImplementation((table: string) => {
      if (table === "apiKeys") return Promise.resolve(dbApiKeys);
      return Promise.resolve([]);
    });

    const auth = await validateApiKey(`Bearer ${key}`);
    expect(typeof auth).not.toBe("string");
    const authContext = auth as any;

    // 3. Confirm scope inspection rejects write operation
    const hasWrite = hasScope(authContext, "write");
    expect(hasWrite).toBe(false);
  });

  it("should confirm revoking an API key causes subsequent requests to fail with 401", async () => {
    // 1. Create an active token
    const createReq = new NextRequest("http://localhost/api/v1/keys", {
      method: "POST",
      body: JSON.stringify({ name: "Deploy Token", scopes: ["read", "write"] }),
    });
    const createRes = await createKey(createReq);
    const { id, key } = await createRes.json();

    // 2. Revoke token via DELETE endpoint
    const delReq = new NextRequest(`http://localhost/api/v1/keys/${id}`, {
      method: "DELETE",
    });
    const delRes = await revokeKey(delReq, { params: { id } });
    expect(delRes.status).toBe(200);

    // 3. Attempt to validate revoked token
    mockFindMany.mockImplementation((table: string) => {
      if (table === "apiKeys") return Promise.resolve(dbApiKeys);
      return Promise.resolve([]);
    });

    const validationResult = await validateApiKey(`Bearer ${key}`);
    expect(validationResult).toBe("API key has been revoked");
  });

  it("should enforce Free plan storage limits (507 Insufficient Storage simulation)", async () => {
    // Populate objects totaling 4.9 GB
    const fourPntNineGB = 4.9 * 1024 * 1024 * 1024;
    dbObjects = [{ id: "obj-1", sizeBytes: fourPntNineGB }];

    // Incoming file upload of 200 MB
    const incomingBytes = 200 * 1024 * 1024;

    const quota = await checkStorageQuota(testUserId, "free", incomingBytes);
    expect(quota.allowed).toBe(false);
    expect(quota.usedBytes + incomingBytes).toBeGreaterThan(quota.limitBytes);
  });

  it("should enforce Free plan max 20 active API keys quota", async () => {
    // Populate 20 active API keys in the database store
    dbApiKeys = Array.from({ length: 20 }, (_, i) => ({
      id: `key-${i}`,
      userId: testUserId,
      revokedAt: null,
    }));

    const req = new NextRequest("http://localhost/api/v1/keys", {
      method: "POST",
      body: JSON.stringify({ name: "21st Token", scopes: ["read"] }),
    });

    const res = await createKey(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain("Active API key quota (20) reached");
  });
});
