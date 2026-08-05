import { describe, it, expect, vi, beforeEach } from "vitest";
import type { drive_v3 } from "googleapis";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Mock env before anything else
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgres://localhost/test",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/callback/google",
    REDIS_URL: "",
    ENCRYPTION_KEY: "a]very-secret-encryption-key-32c",
    JWT_SECRET: "test-secret",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock Redis
vi.mock("@/lib/redis", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth token resolution
vi.mock("../auth", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

// ─── Mock DB Layer ──────────────────────────────────────────────────────────

const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      buckets: { findFirst: (...args: unknown[]) => mockFindFirst("buckets", ...args) },
      objects: { findFirst: (...args: unknown[]) => mockFindFirst("objects", ...args) },
      folderPathCache: { findFirst: (...args: unknown[]) => mockFindFirst("folderPathCache", ...args) },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

// ─── Mock Google Drive API ──────────────────────────────────────────────────

const mockFilesCreate = vi.fn();
const mockFilesGet = vi.fn();
const mockFilesDelete = vi.fn();
const mockFilesList = vi.fn();
const mockFilesUpdate = vi.fn();
const mockAboutGet = vi.fn();

const { MockOAuth2 } = vi.hoisted(() => {
  class _MockOAuth2 {
    setCredentials = vi.fn();
  }
  return { MockOAuth2: _MockOAuth2 };
});

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: MockOAuth2,
    },
    drive: vi.fn().mockReturnValue({
      files: {
        create: (...args: unknown[]) => mockFilesCreate(...args),
        get: (...args: unknown[]) => mockFilesGet(...args),
        delete: (...args: unknown[]) => mockFilesDelete(...args),
        list: (...args: unknown[]) => mockFilesList(...args),
        update: (...args: unknown[]) => mockFilesUpdate(...args),
      },
      about: {
        get: (...args: unknown[]) => mockAboutGet(...args),
      },
    } as unknown as drive_v3.Drive),
  },
}));

// ─── Mock folder resolution ─────────────────────────────────────────────────

vi.mock("../folders", () => ({
  resolveOrCreateFolderPath: vi.fn().mockResolvedValue("mock-parent-folder-id"),
  getFileName: vi.fn().mockImplementation((key: string) => {
    const parts = key.split("/");
    return parts[parts.length - 1];
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { GoogleDriveProvider } from "../provider";
import { cacheGet, cacheSet } from "@/lib/redis";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createReadableStream(content: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

function setupMockBucket() {
  mockFindFirst.mockImplementation((table: string) => {
    if (table === "buckets") {
      return Promise.resolve({
        id: "bucket-1",
        userId: "user-1",
        connectionId: "conn-1",
        name: "default",
        providerFolderId: "root-folder-id",
        createdAt: new Date(),
      });
    }
    return Promise.resolve(null);
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GoogleDriveProvider", () => {
  let provider: GoogleDriveProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GoogleDriveProvider("test-connection-id");
  });

  // ── Upload Tests ────────────────────────────────────────────────────────

  describe("uploadObject", () => {
    it("should upload a file in a nested path and create object + version records", async () => {
      setupMockBucket();

      // No existing file in Drive
      mockFilesList.mockResolvedValue({ data: { files: [] } });

      // Simulate Drive upload response
      mockFilesCreate.mockResolvedValue({
        data: {
          id: "drive-file-1",
          name: "user1.png",
          size: "1024",
          md5Checksum: "abc123md5",
          mimeType: "image/png",
          modifiedTime: "2026-01-01T00:00:00Z",
        },
      });

      // No existing object in DB
      mockFindFirst.mockImplementation((table: string) => {
        if (table === "buckets") {
          return Promise.resolve({
            id: "bucket-1",
            providerFolderId: "root-folder-id",
          });
        }
        return Promise.resolve(null);
      });

      // Mock insert returning
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "obj-1" }]),
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "obj-1" }]),
          }),
        }),
      });

      // Mock select for max version
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxVersion: 0 }]),
        }),
      });

      // Mock update
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const stream = createReadableStream("file content");
      const result = await provider.uploadObject("bucket-1", "images/avatars/user1.png", stream, {
        contentType: "image/png",
      });

      expect(result.bucketId).toBe("bucket-1");
      expect(result.key).toBe("images/avatars/user1.png");
      expect(result.metadata.etag).toBe("abc123md5");
      expect(result.metadata.contentType).toBe("image/png");

      // Verify Drive create was called
      expect(mockFilesCreate).toHaveBeenCalled();
    });

    it("should use resumable upload for files > 5MB", async () => {
      setupMockBucket();

      mockFilesList.mockResolvedValue({ data: { files: [] } });
      mockFilesCreate.mockResolvedValue({
        data: {
          id: "drive-file-large",
          name: "bigfile.zip",
          size: String(10 * 1024 * 1024),
          md5Checksum: "large-md5",
          mimeType: "application/zip",
          modifiedTime: "2026-01-01T00:00:00Z",
        },
      });

      mockFindFirst.mockImplementation((table: string) => {
        if (table === "buckets") {
          return Promise.resolve({
            id: "bucket-1",
            providerFolderId: "root-folder-id",
          });
        }
        return Promise.resolve(null);
      });

      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "obj-2" }]),
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "obj-2" }]),
          }),
        }),
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxVersion: 0 }]),
        }),
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Create a large stream (> 5MB)
      const largeContent = "x".repeat(6 * 1024 * 1024);
      const stream = createReadableStream(largeContent);

      const result = await provider.uploadObject("bucket-1", "data/bigfile.zip", stream, {
        contentType: "application/zip",
      });

      expect(result.metadata.etag).toBe("large-md5");
      expect(mockFilesCreate).toHaveBeenCalled();
    });
  });

  // ── Delete Tests ────────────────────────────────────────────────────────

  describe("deleteObject", () => {
    it("should handle deleting a file that no longer exists on Drive", async () => {
      // Object exists in DB
      mockFindFirst.mockResolvedValue({
        id: "obj-1",
        bucketId: "bucket-1",
        key: "images/deleted.png",
        providerFileId: "drive-file-gone",
      });

      // Drive returns 404
      mockFilesDelete.mockRejectedValue({ code: 404 });

      // Mock delete
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Should NOT throw
      await expect(
        provider.deleteObject("bucket-1", "images/deleted.png")
      ).resolves.toBeUndefined();

      // DB cleanup should still happen
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should delete from Drive and then clean up DB for existing files", async () => {
      mockFindFirst.mockResolvedValue({
        id: "obj-1",
        bucketId: "bucket-1",
        key: "images/existing.png",
        providerFileId: "drive-file-exists",
      });

      mockFilesDelete.mockResolvedValue({});
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      await provider.deleteObject("bucket-1", "images/existing.png");

      expect(mockFilesDelete).toHaveBeenCalledWith({ fileId: "drive-file-exists" });
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  // ── List Tests ──────────────────────────────────────────────────────────

  describe("listObjects", () => {
    it("should list files and handle pagination via nextPageToken", async () => {
      setupMockBucket();

      // First page
      mockFilesList.mockResolvedValueOnce({
        data: {
          files: [
            {
              id: "f1",
              name: "file1.txt",
              size: "100",
              md5Checksum: "md5-1",
              mimeType: "text/plain",
              modifiedTime: "2026-01-01T00:00:00Z",
            },
            {
              id: "f2",
              name: "file2.txt",
              size: "200",
              md5Checksum: "md5-2",
              mimeType: "text/plain",
              modifiedTime: "2026-01-02T00:00:00Z",
            },
          ],
          nextPageToken: "page2token",
        },
      });

      const result = await provider.listObjects("bucket-1");

      expect(result.objects).toHaveLength(2);
      expect(result.nextCursor).toBe("page2token");
      expect(result.objects[0].key).toBe("file1.txt");
      expect(result.objects[1].key).toBe("file2.txt");
    });

    it("should filter by prefix", async () => {
      setupMockBucket();

      mockFilesList.mockResolvedValue({
        data: {
          files: [
            {
              id: "f1",
              name: "matching.txt",
              size: "100",
              md5Checksum: "md5-1",
              mimeType: "text/plain",
              modifiedTime: "2026-01-01T00:00:00Z",
            },
            {
              id: "f2",
              name: "other.txt",
              size: "200",
              md5Checksum: "md5-2",
              mimeType: "text/plain",
              modifiedTime: "2026-01-02T00:00:00Z",
            },
          ],
          nextPageToken: undefined,
        },
      });

      const result = await provider.listObjects("bucket-1", "match");

      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].key).toBe("matching.txt");
    });
  });

  // ── Quota Tests ─────────────────────────────────────────────────────────

  describe("getProviderQuota", () => {
    it("should fetch quota from Drive and cache in Redis", async () => {
      mockAboutGet.mockResolvedValue({
        data: {
          storageQuota: {
            usage: "1073741824", // 1GB
            limit: "16106127360", // 15GB
          },
        },
      });

      const result = await provider.getProviderQuota("test-connection-id");

      expect(result.usedBytes).toBe(1073741824);
      expect(result.totalBytes).toBe(16106127360);
      expect(cacheSet).toHaveBeenCalledWith(
        "quota:test-connection-id",
        expect.any(String),
        900
      );
    });

    it("should return cached quota if available", async () => {
      const cachedData = { usedBytes: 500, totalBytes: 15000 };
      vi.mocked(cacheGet).mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await provider.getProviderQuota("test-connection-id");

      expect(result).toEqual(cachedData);
      expect(mockAboutGet).not.toHaveBeenCalled();
    });
  });

  // ── Metadata Tests ──────────────────────────────────────────────────────

  describe("getObjectMetadata", () => {
    it("should return metadata from DB when cache is fresh", async () => {
      mockFindFirst.mockResolvedValue({
        id: "obj-1",
        bucketId: "bucket-1",
        key: "file.txt",
        providerFileId: "drive-1",
        sizeBytes: 1024,
        contentType: "text/plain",
        updatedAt: new Date(), // Fresh
        etag: "md5-fresh",
      });

      const meta = await provider.getObjectMetadata("bucket-1", "file.txt");

      expect(meta.size).toBe(1024);
      expect(meta.etag).toBe("md5-fresh");
      // Should NOT call Drive API since cache is fresh
      expect(mockFilesGet).not.toHaveBeenCalled();
    });

    it("should fall back to Drive API when cache is stale", async () => {
      const staleDate = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      mockFindFirst.mockResolvedValue({
        id: "obj-1",
        bucketId: "bucket-1",
        key: "stale.txt",
        providerFileId: "drive-stale",
        sizeBytes: 512,
        contentType: "text/plain",
        updatedAt: staleDate,
        etag: "old-etag",
      });

      mockFilesGet.mockResolvedValue({
        data: {
          id: "drive-stale",
          name: "stale.txt",
          size: "2048",
          md5Checksum: "new-etag",
          mimeType: "text/plain",
          modifiedTime: new Date().toISOString(),
        },
      });

      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const meta = await provider.getObjectMetadata("bucket-1", "stale.txt");

      expect(meta.size).toBe(2048);
      expect(meta.etag).toBe("new-etag");
      expect(mockFilesGet).toHaveBeenCalled();
    });
  });
});
