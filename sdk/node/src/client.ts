import {
  BYOSClientOptions,
  UploadData,
  UploadOptions,
  UploadResponse,
  DownloadOptions,
  DownloadResponse,
  ListOptions,
  ListObjectsResponse,
  SignOptions,
  SignResponse,
  MetadataResponse,
  ListVersionsResponse,
  RestoreVersionResponse,
} from "./types";
import { BYOSError, createBYOSError } from "./errors";
import { normalizeUploadBody, withRetry } from "./utils";

/**
 * BYOSClient: Drop-in S3-compatible cloud object storage client powered by user storage connections.
 * 
 * Provides automated retries with exponential backoff on transient errors, intelligent runtime streaming capabilities for both Node and browser runtimes, and strict typed exception handling.
 * 
 * @example
 * ```typescript
 * const client = new BYOSClient({
 *   apiKey: "byos_live_abc123...",
 *   bucket: "my-bucket",
 * });
 * 
 * await client.upload("folder/avatar.png", fileBuffer, { contentType: "image/png" });
 * const downloaded = await client.download("folder/avatar.png");
 * const text = await downloaded.text();
 * ```
 */
export class BYOSClient {
  private readonly apiKey: string;
  private readonly bucket?: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;

  /**
   * Initializes a new BYOS storage client.
   * @param options Client configuration options including apiKey, default bucket name, and optional custom endpoint URL.
   */
  constructor(options: BYOSClientOptions) {
    if (!options || !options.apiKey) {
      throw new BYOSError("An apiKey is required to initialize BYOSClient.", "InvalidConfig", 400);
    }
    this.apiKey = options.apiKey;
    this.bucket = options.bucket;
    const envUrl = typeof process !== "undefined" && process?.env ? process.env.BYOS_API_URL : undefined;
    this.baseUrl = (options.baseUrl || envUrl || "http://localhost:3000").replace(/\/$/, "");
    this.maxRetries = typeof options.maxRetries === "number" ? options.maxRetries : 3;
  }

  private resolveBucket(overrideBucket?: string): string {
    const target = overrideBucket || this.bucket;
    if (!target) {
      throw new BYOSError(
        "Bucket name is required. Either specify a bucket in the BYOSClient constructor or pass it inside method options.",
        "MissingBucket",
        400
      );
    }
    return target;
  }

  private encodeKey(key: string): string {
    const cleaned = key.startsWith("/") ? key.slice(1) : key;
    return cleaned.split("/").map(encodeURIComponent).join("/");
  }

  private async request<T = any>(
    method: string,
    path: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, string | number | undefined>;
      isStreamResponse?: boolean;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      ...options?.headers,
    };

    const fetchOptions: RequestInit & { duplex?: string } = {
      method,
      headers,
      body: options?.body,
    };

    // Node.js fetch requires duplex: "half" when transmitting readable stream bodies
    if (options?.body && (method === "PUT" || method === "POST")) {
      fetchOptions.duplex = "half";
    }

    return withRetry(async () => {
      const response = await fetch(url.toString(), fetchOptions);

      if (!response.ok) {
        let errBody: any = {};
        try {
          errBody = await response.json();
        } catch {
          // If response body is empty or non-JSON, fallback to default error structures
        }
        throw createBYOSError(response.status, errBody);
      }

      if (options?.isStreamResponse) {
        return response as unknown as T;
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      try {
        return (await response.json()) as T;
      } catch {
        return undefined as unknown as T;
      }
    }, this.maxRetries);
  }

  /**
   * Uploads an object to storage. Equivalent to S3 PutObject.
   * Supports Node Buffer/Streams, browser File/Blob instances, Uint8Array, and text strings.
   * 
   * @param key S3 object key path (e.g. "images/logo.png").
   * @param data File payload to store.
   * @param options Optional metadata overrides (contentType, target bucket).
   * @returns Promise containing verified ETag checksum, uploaded bytes size, and versionId.
   */
  async upload(
    key: string,
    data: UploadData,
    options?: UploadOptions
  ): Promise<UploadResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    const { body, contentType } = normalizeUploadBody(data, options?.contentType);

    return this.request<UploadResponse>(
      "PUT",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      {
        body,
        headers: {
          "Content-Type": contentType,
        },
      }
    );
  }

  /**
   * Downloads an object from storage with streaming support. Equivalent to S3 GetObject.
   * Supports Range headers for partial content retrieval and video streaming.
   * 
   * @param key S3 object key path to download.
   * @param options Optional overrides (target bucket, HTTP Range header string).
   * @returns Promise resolving to a DownloadResponse stream with helpful extraction utilities (.text(), .blob(), .buffer(), .arrayBuffer()).
   */
  async download(
    key: string,
    options?: DownloadOptions
  ): Promise<DownloadResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    const headers: Record<string, string> = {};
    if (options?.range) {
      headers["Range"] = options.range;
    }

    const res = await this.request<Response>(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      {
        headers,
        isStreamResponse: true,
      }
    );

    const stream = res.body;
    const contentType = res.headers.get("content-type") || null;
    const lengthStr = res.headers.get("content-length");
    const contentLength = lengthStr ? parseInt(lengthStr, 10) : null;
    const etag = res.headers.get("etag") || null;
    const lastModified = res.headers.get("last-modified") || null;

    return {
      stream,
      contentType,
      contentLength,
      etag,
      lastModified,
      async blob() {
        return res.blob();
      },
      async arrayBuffer() {
        return res.arrayBuffer();
      },
      async text() {
        return res.text();
      },
      async buffer() {
        const ab = await res.arrayBuffer();
        return typeof Buffer !== "undefined" ? Buffer.from(ab) : (new Uint8Array(ab) as any);
      },
    };
  }

  /**
   * Permanently deletes an object from storage. Equivalent to S3 DeleteObject.
   * Returns successfully if object existed or was already deleted (Idempotency).
   * 
   * @param key S3 object key path to delete.
   * @param options Optional target bucket override.
   */
  async delete(key: string, options?: { bucket?: string }): Promise<void> {
    const bucket = this.resolveBucket(options?.bucket);
    await this.request<void>(
      "DELETE",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`
    );
  }

  /**
   * Lists objects within a bucket with pagination and prefix filtering. Equivalent to S3 ListObjectsV2.
   * Surfaces synchronization health status (`syncStatus`) against Google Drive.
   * 
   * @param options Optional configuration for filtering prefix, pagination maxKeys (default 1000), and cursor startAfter.
   * @returns Promise containing matching items and truncation continuation flags.
   */
  async list(options?: ListOptions): Promise<ListObjectsResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    const query = {
      prefix: options?.prefix,
      maxKeys: options?.maxKeys,
      startAfter: options?.startAfter,
    };

    const data = await this.request<any>(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects`,
      { query }
    );

    return {
      name: data.Name || data.name || bucket,
      prefix: data.Prefix ?? data.prefix ?? (options?.prefix || ""),
      maxKeys: options?.maxKeys || 1000,
      isTruncated: Boolean(data.IsTruncated ?? data.isTruncated),
      contents: (data.Contents || data.contents || []).map((item: any) => ({
        key: item.Key || item.key,
        size: item.Size ?? item.size ?? 0,
        etag: item.ETag || item.etag || "",
        syncStatus: item.SyncStatus || item.syncStatus || "synced",
        lastModified: typeof item.LastModified === "string"
          ? item.LastModified
          : item.LastModified?.toISOString?.() || String(item.LastModified || new Date().toISOString()),
      })),
    };
  }

  /**
   * Generates a secure presigned access URL for direct end-user file viewing or uploading. Equivalent to S3 getSignedUrl.
   * Eliminates the need to proxy bandwidth through backend servers for large file transfer scale.
   * 
   * @param key S3 object key path to authorize access for.
   * @param options Required configuration specifying operation ("get" or "put") and expiration time in seconds (max 7 days).
   * @returns Promise containing the authenticated signed link and timestamp parameters.
   */
  async getSignedUrl(key: string, options: SignOptions): Promise<SignResponse> {
    const bucket = this.resolveBucket(options.bucket);
    const body = {
      operation: options.operation,
      expiresIn: typeof options.expiresIn === "number" ? options.expiresIn : 3600,
    };

    const data = await this.request<any>(
      "POST",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/sign`,
      {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }
    );

    return {
      url: data.url,
      grantId: data.grantId,
      expiresAt: data.expiresAt,
      operation: data.operation || options.operation,
    };
  }

  /**
   * Retrieves object header metadata (size, contentType, etag) without transmitting file contents. Equivalent to S3 HeadObject.
   * 
   * @param key S3 object key path.
   * @param options Optional target bucket override.
   * @returns Promise containing metadata headers or throws BYOSNotFoundError if object does not exist.
   */
  async getMetadata(key: string, options?: { bucket?: string }): Promise<MetadataResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    const res = await this.request<Response>(
      "HEAD",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      { isStreamResponse: true }
    );

    const lengthStr = res.headers.get("content-length");
    return {
      contentType: res.headers.get("content-type") || null,
      contentLength: lengthStr ? parseInt(lengthStr, 10) : null,
      etag: res.headers.get("etag") || null,
      lastModified: res.headers.get("last-modified") || null,
    };
  }

  /**
   * Lists all historical archival snapshots of an object, sorted newest first.
   * 
   * @param key S3 object key path.
   * @param options Optional target bucket override.
   * @returns Promise resolving to an array of archived version records.
   */
  async listVersions(
    key: string,
    options?: { bucket?: string }
  ): Promise<ListVersionsResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    const data = await this.request<any>(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/versions`
    );

    return {
      key: data.Key || data.key || key,
      currentVersionId: data.CurrentVersionId || data.currentVersionId || null,
      versions: (data.Versions || data.versions || []).map((v: any) => ({
        versionId: v.VersionId || v.versionId,
        versionNumber: v.VersionNumber ?? v.versionNumber ?? 1,
        sizeBytes: v.Size ?? v.sizeBytes ?? 0,
        etag: v.ETag || v.etag || "",
        createdAt: typeof v.CreatedAt === "string" ? v.CreatedAt : String(v.CreatedAt || ""),
      })),
    };
  }

  /**
   * Restores a past historical version snapshot to become the newly active current version.
   * To prevent underlying cloud garbage collection, this duplicates the content blob rather than moving pointers.
   * 
   * @param key S3 object key path.
   * @param versionId The UUID of the historical version to restore.
   * @param options Optional target bucket override.
   * @returns Promise containing the new version upload metadata.
   */
  async restoreVersion(
    key: string,
    versionId: string | number,
    options?: { bucket?: string }
  ): Promise<RestoreVersionResponse> {
    const bucket = this.resolveBucket(options?.bucket);
    return this.request<RestoreVersionResponse>(
      "POST",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/versions/${String(versionId)}/restore`
    );
  }
}

export default BYOSClient;
