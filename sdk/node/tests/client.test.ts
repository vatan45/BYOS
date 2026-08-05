import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import BYOSClient, {
  BYOSNotFoundError,
  BYOSAuthError,
  BYOSQuotaError,
  BYOSRateLimitError,
  BYOSError,
} from "../src/index";

const baseUrl = "http://api.test.byos.dev";

let retryAttemptCounter = 0;

const server = setupServer(
  // 1. Upload Object (PUT)
  http.put(`${baseUrl}/api/v1/buckets/:bucket/objects/*`, async ({ request, params }) => {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return HttpResponse.json({ error: { code: "InvalidApiKey", message: "Missing authorization" } }, { status: 401 });
    }
    if (params.bucket === "quota-exceeded-bucket") {
      return HttpResponse.json({ error: { code: "InsufficientStorage", message: "Storage limit exceeded for user plan" } }, { status: 507 });
    }
    return HttpResponse.json({
      key: "folder/test.txt",
      etag: "md5-etag-hash",
      size: 1024,
      versionId: 1,
    });
  }),

  // 2. Download Object / Versions List (GET)
  http.get(`${baseUrl}/api/v1/buckets/:bucket/objects/*`, ({ request, params }) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/versions")) {
      return HttpResponse.json({
        Key: "config.json",
        CurrentVersionId: "ver-current",
        Versions: [
          { VersionId: "ver-2", VersionNumber: 2, Size: 500, ETag: "hash2", CreatedAt: "2026-08-03T10:00:00Z" },
          { VersionId: "ver-1", VersionNumber: 1, Size: 450, ETag: "hash1", CreatedAt: "2026-08-01T10:00:00Z" },
        ],
      });
    }

    if (url.pathname.includes("missing-file.png")) {
      return HttpResponse.json({ error: { code: "NoSuchKey", message: "Object not found" } }, { status: 404 });
    }

    if (url.pathname.includes("flaky-file.txt")) {
      retryAttemptCounter++;
      if (retryAttemptCounter < 3) {
        return HttpResponse.json({ error: { code: "RateLimitExceeded", message: "Too many requests" } }, { status: 429 });
      }
      return new HttpResponse("Success on retry 3!", {
        headers: { "Content-Type": "text/plain", "Content-Length": "18", ETag: "etag-flaky" },
      });
    }

    if (url.pathname.includes("exhausted-file.txt")) {
      return HttpResponse.json({ error: { code: "RateLimitExceeded", message: "Rate limit reached" } }, { status: 429 });
    }

    return new HttpResponse("Hello from BYOS cloud storage!", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": "31",
        ETag: "etag-12345",
        "Last-Modified": "Sat, 03 Aug 2026 12:00:00 GMT",
      },
    });
  }),

  // 3. Delete Object (DELETE)
  http.delete(`${baseUrl}/api/v1/buckets/:bucket/objects/*`, ({ params }) => {
    if (params.bucket === "forbidden-bucket") {
      return HttpResponse.json({ error: { code: "AccessDenied", message: "You do not have write permissions on this bucket" } }, { status: 403 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // 4. List Objects (GET on bucket root)
  http.get(`${baseUrl}/api/v1/buckets/:bucket/objects`, ({ request, params }) => {
    return HttpResponse.json({
      Name: params.bucket,
      Prefix: new URL(request.url).searchParams.get("prefix") || "",
      IsTruncated: false,
      Contents: [
        { Key: "images/1.png", Size: 2048, ETag: "etag-img1", SyncStatus: "synced", LastModified: "2026-08-03T09:00:00Z" },
        { Key: "images/2.png", Size: 4096, ETag: "etag-img2", SyncStatus: "discovered", LastModified: "2026-08-03T09:05:00Z" },
      ],
      KeyCount: 2,
    });
  }),

  // 5. Presigned URL Generation and Version Restore (POST)
  http.post(`${baseUrl}/api/v1/buckets/:bucket/objects/*`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/restore")) {
      return HttpResponse.json({
        key: "config.json",
        etag: "restored-etag",
        size: 450,
        versionId: 3,
        restoredFromVersionId: "ver-1",
      });
    }

    if (url.pathname.endsWith("/sign")) {
      const body: any = await request.json();
      return HttpResponse.json({
        url: `${baseUrl}/s/my-bucket/test.png?exp=9999999&sig=sig-hash&op=${body.operation}`,
        grantId: "grant-uuid-1",
        expiresAt: "2026-08-10T12:00:00Z",
        operation: body.operation,
      });
    }
    return HttpResponse.json({ error: { code: "InvalidRequest", message: "Unknown post target" } }, { status: 400 });
  }),

  // 6. Object Metadata (HEAD)
  http.head(`${baseUrl}/api/v1/buckets/:bucket/objects/*`, ({ request }) => {
    if (request.url.includes("unknown.hdr")) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": "819200",
        ETag: "etag-pdf-999",
        "Last-Modified": "Fri, 02 Aug 2026 10:00:00 GMT",
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  retryAttemptCounter = 0;
});
afterAll(() => server.close());

describe("BYOSClient SDK Suite", () => {
  const client = new BYOSClient({
    apiKey: "byos_live_testkey12345",
    bucket: "test-bucket",
    baseUrl,
  });

  it("should enforce mandatory constructor and bucket requirements", async () => {
    expect(() => new (BYOSClient as any)({})).toThrow("An apiKey is required to initialize BYOSClient.");

    const bucketlessClient = new BYOSClient({ apiKey: "byos_live_no_bucket", baseUrl });
    await expect(bucketlessClient.upload("test.png", "data")).rejects.toThrow("Bucket name is required");
  });

  it("should upload object data and receive ETag and version metadata", async () => {
    const res = await client.upload("folder/test.txt", "Hello upload data", { contentType: "text/plain" });
    expect(res.key).toBe("folder/test.txt");
    expect(res.etag).toBe("md5-etag-hash");
    expect(res.size).toBe(1024);
    expect(res.versionId).toBe(1);
  });

  it("should throw BYOSQuotaError (507) when upload target exceeds user plan storage", async () => {
    const quotaClient = new BYOSClient({ apiKey: "byos_live_test", bucket: "quota-exceeded-bucket", baseUrl });
    await expect(quotaClient.upload("massive.zip", "big-file")).rejects.toThrow(BYOSQuotaError);
  });

  it("should download object and support stream reading helper methods", async () => {
    const downloaded = await client.download("welcome.txt", { range: "bytes=0-30" });
    expect(downloaded.contentType).toBe("text/plain");
    expect(downloaded.contentLength).toBe(31);
    expect(downloaded.etag).toBe("etag-12345");

    const textContent = await downloaded.text();
    expect(textContent).toBe("Hello from BYOS cloud storage!");
  });

  it("should convert downloaded stream into Node Buffer and Web Blob equivalents", async () => {
    const downloaded = await client.download("welcome.txt");
    const buf = await downloaded.buffer();
    expect(buf.toString("utf-8")).toBe("Hello from BYOS cloud storage!");
  });

  it("should throw BYOSNotFoundError (404 / NoSuchKey) for non-existent downloads", async () => {
    await expect(client.download("missing-file.png")).rejects.toThrow(BYOSNotFoundError);
  });

  it("should delete objects and throw BYOSAuthError (403) on unauthorized buckets", async () => {
    await expect(client.delete("obsolete.log")).resolves.toBeUndefined();

    const noAuthClient = new BYOSClient({ apiKey: "byos_live_guest", bucket: "forbidden-bucket", baseUrl });
    await expect(noAuthClient.delete("secret.db")).rejects.toThrow(BYOSAuthError);
  });

  it("should list objects and normalize S3 uppercase keys while preserving syncStatus", async () => {
    const res = await client.list({ prefix: "images/" });
    expect(res.name).toBe("test-bucket");
    expect(res.prefix).toBe("images/");
    expect(res.isTruncated).toBe(false);
    expect(res.contents).toHaveLength(2);
    expect(res.contents[0].key).toBe("images/1.png");
    expect(res.contents[1].syncStatus).toBe("discovered");
  });

  it("should generate short-lived presigned upload and download URLs", async () => {
    const signed = await client.getSignedUrl("test.png", { operation: "put", expiresIn: 7200 });
    expect(signed.url).toContain("exp=9999999");
    expect(signed.url).toContain("sig=sig-hash");
    expect(signed.operation).toBe("put");
    expect(signed.grantId).toBe("grant-uuid-1");
  });

  it("should fetch object headers using getMetadata without consuming payload body", async () => {
    const meta = await client.getMetadata("document.pdf");
    expect(meta.contentType).toBe("application/pdf");
    expect(meta.contentLength).toBe(819200);
    expect(meta.etag).toBe("etag-pdf-999");

    await expect(client.getMetadata("unknown.hdr")).rejects.toThrow(BYOSNotFoundError);
  });

  it("should list historical object versions and perform version restorations", async () => {
    const history = await client.listVersions("config.json");
    expect(history.currentVersionId).toBe("ver-current");
    expect(history.versions).toHaveLength(2);

    const restoreRes = await client.restoreVersion("config.json", history.versions[1].versionId);
    expect(restoreRes.versionId).toBe(3);
    expect(restoreRes.restoredFromVersionId).toBe("ver-1");
  });

  it("should execute exponential backoff retries on transient errors (429 RateLimit / 5xx) and recover", async () => {
    const res = await client.download("flaky-file.txt");
    const content = await res.text();
    expect(content).toBe("Success on retry 3!");
    expect(retryAttemptCounter).toBe(3);
  });

  it("should raise BYOSRateLimitError when retry limit is exhausted on persistent 429 responses", async () => {
    const fastFailClient = new BYOSClient({ apiKey: "byos_live_test", bucket: "test-bucket", baseUrl, maxRetries: 1 });
    await expect(fastFailClient.download("exhausted-file.txt")).rejects.toThrow(BYOSRateLimitError);
  });
});
