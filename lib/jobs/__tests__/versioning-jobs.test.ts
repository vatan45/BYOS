import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    REDIS_URL: "",
  },
}));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      objects: { findMany: (...args: unknown[]) => mockFindMany("objects", ...args) },
      objectVersions: { findMany: (...args: unknown[]) => mockFindMany("objectVersions", ...args) },
      buckets: {
        findFirst: (...args: unknown[]) => mockFindFirst("buckets", ...args),
        findMany: (...args: unknown[]) => mockFindMany("buckets", ...args),
      },
      storageConnections: { findMany: (...args: unknown[]) => mockFindMany("storageConnections", ...args) },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockDeleteProviderFile = vi.fn();
const mockListAllObjectsRecursive = vi.fn();

vi.mock("@/lib/api/resolve-provider", () => ({
  getProvider: vi.fn(() => ({
    deleteProviderFile: mockDeleteProviderFile,
    listAllObjectsRecursive: mockListAllObjectsRecursive,
  })),
}));

import { runVersionPruning } from "../prune-versions";
import { reconcileBucket } from "../reconcile-drive-state";

describe("Versioning & State Reconciliation Jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runVersionPruning", () => {
    it("should prune old versions exceeding the retention limit while protecting currentVersionId", async () => {
      mockFindMany.mockImplementation((table: string) => {
        if (table === "objects") {
          return Promise.resolve([
            { id: "obj-1", bucketId: "b-1", currentVersionId: "ver-current" },
          ]);
        }
        if (table === "objectVersions") {
          return Promise.resolve([
            { id: "ver-4", versionNumber: 4, providerFileId: "file-4" },
            { id: "ver-3", versionNumber: 3, providerFileId: "file-3" },
            { id: "ver-current", versionNumber: 2, providerFileId: "file-2" }, // Protected even if past limit
            { id: "ver-1", versionNumber: 1, providerFileId: "file-1" },
          ]);
        }
        return Promise.resolve([]);
      });

      mockFindFirst.mockImplementation((table: string) => {
        if (table === "buckets") {
          return Promise.resolve({ id: "b-1", connectionId: "conn-1" });
        }
        return Promise.resolve(null);
      });

      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      mockDelete.mockImplementation(() => ({ where: deleteWhere }));

      // Set retention limit to 2 (should keep ver-4 and ver-3, plus protect ver-current, pruning ver-1)
      const res = await runVersionPruning(2);

      expect(res.objectsProcessed).toBe(1);
      expect(res.prunedCount).toBe(1);
      expect(mockDeleteProviderFile).toHaveBeenCalledWith("file-1");
      expect(deleteWhere).toHaveBeenCalledTimes(1);
    });
  });

  describe("reconcileBucket", () => {
    it("should flag orphaned DB records as missing_in_provider and discover untracked Drive uploads", async () => {
      mockFindFirst.mockImplementation((table: string) => {
        if (table === "buckets") {
          return Promise.resolve({ id: "b-1", connectionId: "conn-1" });
        }
        return Promise.resolve(null);
      });

      // DB currently knows about file-existing and file-deleted-externally
      mockFindMany.mockImplementation((table: string) => {
        if (table === "objects") {
          return Promise.resolve([
            { id: "obj-1", key: "docs/existing.txt", providerFileId: "drive-1", syncStatus: "synced" },
            { id: "obj-2", key: "docs/deleted.txt", providerFileId: "drive-2", syncStatus: "synced" },
          ]);
        }
        return Promise.resolve([]);
      });

      // Drive actually contains file-existing and an untracked file-discovered
      mockListAllObjectsRecursive.mockResolvedValue([
        {
          key: "docs/existing.txt",
          metadata: { providerFileId: "drive-1", size: 100, etag: "md5-1", contentType: "text/plain", updatedAt: new Date() },
        },
        {
          key: "docs/new_direct.txt",
          metadata: { providerFileId: "drive-3", size: 250, etag: "md5-3", contentType: "text/plain", updatedAt: new Date() },
        },
      ]);

      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
      mockUpdate.mockImplementation(() => ({ set: updateSet }));

      const insertReturning = vi.fn()
        .mockResolvedValueOnce([{ id: "new-obj-id" }])
        .mockResolvedValueOnce([{ id: "new-ver-id" }]);
      const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
      mockInsert.mockImplementation(() => ({ values: insertValues }));

      const res = await reconcileBucket("b-1");

      expect(res.orphaned).toBe(1);
      expect(res.discovered).toBe(1);

      // Verify update called to mark deleted.txt as missing_in_provider
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: "missing_in_provider" })
      );

      // Verify insert called for new_direct.txt as discovered
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "docs/new_direct.txt",
          providerFileId: "drive-3",
          syncStatus: "discovered",
        })
      );
    });
  });
});
