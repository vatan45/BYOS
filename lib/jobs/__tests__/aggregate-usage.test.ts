import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { REDIS_URL: "" },
}));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      usageLogs: { findMany: (...args: unknown[]) => mockFindMany("usageLogs", ...args) },
      usageDailyRollups: { findFirst: (...args: unknown[]) => mockFindFirst("usageDailyRollups", ...args) },
    },
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

import { runUsageAggregation } from "../aggregate-usage";

describe("Usage Aggregation Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should group granular usage_logs by date/user/bucket and upsert daily rollups", async () => {
    mockFindMany.mockImplementation((table) => {
      if (table === "usageLogs") {
        return Promise.resolve([
          { userId: "u-1", bucketId: "b-1", operation: "upload", bytesTransferred: 1024, createdAt: new Date("2026-08-04T10:00:00Z") },
          { userId: "u-1", bucketId: "b-1", operation: "download", bytesTransferred: 512, createdAt: new Date("2026-08-04T12:00:00Z") },
          { userId: "u-1", bucketId: "b-1", operation: "delete", bytesTransferred: 0, createdAt: new Date("2026-08-04T14:00:00Z") },
        ]);
      }
      return Promise.resolve([]);
    });

    mockFindFirst.mockResolvedValueOnce(null); // No existing rollup

    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockImplementation(() => ({ values: insertValues }));

    const res = await runUsageAggregation();
    expect(res.rowsProcessed).toBe(3);
    expect(res.rollupsUpdated).toBe(1);

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        bucketId: "b-1",
        date: "2026-08-04",
        uploadCount: 1,
        downloadCount: 1,
        deleteCount: 1,
        bytesUploaded: 1024,
        bytesDownloaded: 512,
        requestCount: 3,
      })
    );
  });
});
