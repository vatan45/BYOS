/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock env variables
vi.mock("@/lib/env", () => ({
  env: {
    REDIS_URL: "",
    GOOGLE_CLIENT_ID: "mock-client-id",
    GOOGLE_CLIENT_SECRET: "mock-client-secret",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
  },
}));

// Mock Google Drive Provider calls
const mockUploadObject = vi.fn();
const mockDeleteObject = vi.fn();
const mockListAllObjects = vi.fn();
const mockGetMetadata = vi.fn();

vi.mock("@/lib/api/resolve-provider", () => ({
  getProvider: (connId: string) => ({
    uploadObject: mockUploadObject,
    deleteObject: mockDeleteObject,
    getObjectMetadata: mockGetMetadata,
    listAllObjectsRecursive: mockListAllObjects,
  }),
}));

// In-memory relational store simulation
let dbUsers: any[] = [];
let dbConnections: any[] = [];
let dbBuckets: any[] = [];
let dbApiKeys: any[] = [];
let dbObjects: any[] = [];
let dbSignedUrlGrants: any[] = [];
let dbUsageLogs: any[] = [];

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: {
        findFirst: async ({ where }: any) => {
          // If query checks ID, return if matched or fallback to test user if DEFAULT_MVP_USER_ID
          if (dbUsers.length > 0) return dbUsers[0];
          return null;
        },
        findMany: async () => dbUsers,
      },
      storageConnections: {
        findFirst: async () => dbConnections[0] || null,
        findMany: async () => dbConnections,
      },
      buckets: {
        findFirst: async () => dbBuckets[0] || null,
        findMany: async () => dbBuckets,
      },
      apiKeys: {
        findFirst: async () => dbApiKeys.find((k) => !k.revokedAt) || dbApiKeys[0] || null,
        findMany: async () => dbApiKeys,
      },
      objects: {
        findFirst: async () => dbObjects[0] || null,
        findMany: async () => dbObjects,
      },
      signedUrlGrants: {
        findFirst: async () => dbSignedUrlGrants[0] || null,
        findMany: async () => dbSignedUrlGrants,
      },
      usageLogs: {
        findMany: async () => dbUsageLogs,
      },
    },
    insert: (table: any) => ({
      values: (val: any) => {
        const record = { id: `id-${Date.now()}`, createdAt: new Date(), ...val };
        if (val.keyPrefix !== undefined) {
          dbApiKeys.push(record);
        } else if (val.providerAccountEmail !== undefined) {
          dbConnections.push(record);
        } else if (val.providerFolderId !== undefined && val.name !== undefined) {
          dbBuckets.push(record);
        } else if (val.signature !== undefined) {
          dbSignedUrlGrants.push(record);
        } else if (val.operation !== undefined && val.bytesTransferred !== undefined) {
          dbUsageLogs.push(record);
        } else if (val.email !== undefined && val.plan !== undefined) {
          dbUsers.push(record);
        } else {
          dbObjects.push(record);
        }
        return {
          returning: async () => [record],
          then: (onFalsy: any, onError: any) => Promise.resolve([record]).then(onFalsy, onError),
          catch: (onError: any) => Promise.resolve([record]).catch(onError),
        };
      },
    }),
    update: (table: any) => ({
      set: (updates: any) => ({
        where: async () => {
          if (updates.revokedAt !== undefined) {
            dbApiKeys.forEach((k) => (k.revokedAt = updates.revokedAt));
          } else if (updates.plan !== undefined) {
            dbUsers.forEach((u) => (u.plan = updates.plan));
          }
          return [{}];
        },
      }),
    }),
    delete: (table: any) => ({
      where: async () => {
        dbObjects = [];
        return [{}];
      },
    }),
  },
}));

import { GET as getOverview } from "@/app/api/v1/dashboard/overview/route";
import { POST as createKey, GET as listKeys } from "@/app/api/v1/keys/route";
import { DELETE as revokeKey } from "@/app/api/v1/keys/[id]/route";
import { PUT as uploadObject, POST as signUrl, DELETE as removeObject } from "@/app/api/v1/buckets/[bucket]/objects/[...key]/route";
import { GET as listObjects } from "@/app/api/v1/buckets/[bucket]/objects/route";
import * as sessionModule from "@/lib/auth/session";

describe("BYOS Critical Production Path Integration Suite", () => {
  const testUserId = "00000000-0000-0000-0000-000000000000";
  let activeSecretKey: string = "";
  let createdKeyId: string = "";

  beforeEach(() => {
    vi.clearAllMocks();
    dbUsers = [{ id: testUserId, email: "developer@byos.dev", plan: "pro" }];
    dbConnections = [
      {
        id: "conn-101",
        userId: testUserId,
        providerAccountEmail: "personal-drive@gmail.com",
        status: "active",
        accessToken: "ENCRYPTED_ACCESS_TOKEN_DO_NOT_LEAK",
        refreshToken: "ENCRYPTED_REFRESH_TOKEN_DO_NOT_LEAK",
        createdAt: new Date(),
      },
    ];
    dbBuckets = [
      {
        id: "bucket-default",
        userId: testUserId,
        connectionId: "conn-101",
        name: "default",
        providerFolderId: "gdrive-folder-id",
        createdAt: new Date(),
      },
    ];
    dbObjects = [];
    dbSignedUrlGrants = [];
    dbUsageLogs = [];
    
    mockGetMetadata.mockResolvedValue({
      key: "assets/logo.svg",
      metadata: { etag: '"etag-101"', size: 2450, versionNumber: 1 },
    });
  });

  it("Step 1: Verify Dashboard Overview connects and NEVER leaks encrypted OAuth tokens", async () => {
    const req = new NextRequest("http://localhost/api/v1/dashboard/overview", {
      headers: { "x-user-id": testUserId },
    });

    const response = await getOverview(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("developer@byos.dev");
    expect(body.connection.connected).toBe(true);
    expect(body.connection.email).toBe("personal-drive@gmail.com");

    // Critical Security Check: Ensure encrypted OAuth token strings never exit API responses
    const jsonString = JSON.stringify(body);
    expect(jsonString).not.toContain("ENCRYPTED_ACCESS_TOKEN");
    expect(jsonString).not.toContain("ENCRYPTED_REFRESH_TOKEN");
  });

  it("Step 2: Create API Key (confirms secret token returned once & masked in subsequent lists)", async () => {
    const createReq = new NextRequest("http://localhost/api/v1/keys", {
      method: "POST",
      headers: { "x-user-id": testUserId, "content-type": "application/json" },
      body: JSON.stringify({ name: "Pro Integration Key", scopes: ["read", "write", "list", "delete"] }),
    });

    const createRes = await createKey(createReq);
    const createBody = await createRes.json();

    expect(createRes.status).toBe(201);
    expect(createBody.key).toBeDefined();
    expect(createBody.key.startsWith("byos_live_")).toBe(true);
    
    activeSecretKey = createBody.key;
    createdKeyId = createBody.id;

    // Subsequent listing check
    const listReq = new NextRequest("http://localhost/api/v1/keys", {
      headers: { "x-user-id": testUserId },
    });
    const listRes = await listKeys(listReq);
    const listBody = await listRes.json();

    expect(listRes.status).toBe(200);
    expect(listBody.keys[0].name).toBe("Pro Integration Key");
    // Verify plaintext secret is masked in listing output
    expect(listBody.keys[0].keyPrefix).not.toBe(activeSecretKey);
    expect(listBody.keys[0].keyPrefix).toContain("...");
  });

  it("Step 3: Upload Object via SDK Bearer Token to Google Drive Backing Store", async () => {
    // Mock Drive provider response
    mockUploadObject.mockResolvedValueOnce({
      key: "assets/logo.svg",
      metadata: { etag: '"etag-101"', size: 2450, versionNumber: 1 },
    });

    const uploadReq = new NextRequest("http://localhost/api/v1/buckets/default/objects/assets/logo.svg", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${activeSecretKey}`,
        "content-type": "image/svg+xml",
        "content-length": "2450",
      },
      body: "<svg>BYOS_TEST</svg>",
    });

    const res = await uploadObject(uploadReq, { params: { bucket: "default", key: ["assets", "logo.svg"] } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.key).toBe("assets/logo.svg");
    expect(body.size).toBe(2450);
    expect(mockUploadObject).toHaveBeenCalled();

    // Populate mock DB to reflect completed upload
    dbObjects.push({
      id: "obj-101",
      bucketId: "bucket-default",
      key: "assets/logo.svg",
      sizeBytes: 2450,
      etag: '"etag-101"',
      syncStatus: "synced",
      updatedAt: new Date(),
    });
  });

  it("Step 4: List Objects in Bucket via API", async () => {
    dbObjects = [
      {
        id: "obj-101",
        bucketId: "bucket-default",
        key: "assets/logo.svg",
        sizeBytes: 2450,
        etag: '"etag-101"',
        syncStatus: "synced",
        updatedAt: new Date(),
      },
    ];

    const listReq = new NextRequest("http://localhost/api/v1/buckets/default/objects?prefix=assets", {
      headers: { authorization: `Bearer ${activeSecretKey}` },
    });

    const res = await listObjects(listReq, { params: { bucket: "default" } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.Name).toBe("default");
    expect(body.Contents).toHaveLength(1);
    expect(body.Contents[0].Key).toBe("assets/logo.svg");
  });

  it("Step 5: Generate Presigned Download URL for Object", async () => {
    dbObjects = [{ id: "obj-101", bucketId: "bucket-default", key: "assets/logo.svg" }];

    const signReq = new NextRequest("http://localhost/api/v1/buckets/default/objects/assets/logo.svg/sign", {
      method: "POST",
      headers: { authorization: `Bearer ${activeSecretKey}`, "content-type": "application/json" },
      body: JSON.stringify({ operation: "get", expiresIn: 3600 }),
    });

    const res = await signUrl(signReq, { params: { bucket: "default", key: ["assets", "logo.svg", "sign"] } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toContain("http://localhost:3000/s/bucket-default/");
    expect(body.grantId).toBeDefined();
    expect(body.operation).toBe("get");
  });

  it("Step 6: Delete Object & Clean Provider Store", async () => {
    mockDeleteObject.mockResolvedValueOnce({ deleted: true });
    dbObjects = [{ id: "obj-101", bucketId: "bucket-default", key: "assets/logo.svg" }];

    const delReq = new NextRequest("http://localhost/api/v1/buckets/default/objects/assets/logo.svg", {
      method: "DELETE",
      headers: { authorization: `Bearer ${activeSecretKey}` },
    });

    const res = await removeObject(delReq, { params: { bucket: "default", key: ["assets", "logo.svg"] } });

    // S3 & BYOS specifications return 204 No Content for successful deletions
    expect(res.status).toBe(204);
  });

  it("Step 7: Revoke API Key & Confirm Subsequent Requests Are Blocked (401 Unauthorized)", async () => {
    const revokeReq = new NextRequest(`http://localhost/api/v1/keys/${createdKeyId}`, {
      method: "DELETE",
      headers: { "x-user-id": testUserId },
    });

    const revokeRes = await revokeKey(revokeReq, { params: { id: createdKeyId } });
    expect(revokeRes.status).toBe(200);

    // Verify key in mock store is now flagged as revoked
    expect(dbApiKeys[0].revokedAt).toBeDefined();

    // Temporarily spy on getDashboardSessionUser so it returns null (simulating an external SDK client call without a browser session)
    const spy = vi.spyOn(sessionModule, "getDashboardSessionUser").mockResolvedValueOnce(null);

    // Attempt an authenticated storage list operation using the revoked key
    const blockedReq = new NextRequest("http://localhost/api/v1/buckets/default/objects", {
      headers: { authorization: `Bearer ${activeSecretKey}` },
    });
    const blockedRes = await listObjects(blockedReq, { params: { bucket: "default" } });
    
    // Should be rejected immediately with 401 Unauthorized
    expect(blockedRes.status).toBe(401);
    const blockedBody = await blockedRes.json();
    expect(blockedBody.error.code).toBe("InvalidApiKey");

    spy.mockRestore();
  });
});
