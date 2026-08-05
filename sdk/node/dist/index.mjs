// src/errors.ts
var BYOSError = class extends Error {
  code;
  status;
  details;
  constructor(message, code = "BYOS_ERROR", status, details) {
    super(message);
    this.name = "BYOSError";
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var BYOSNotFoundError = class extends BYOSError {
  constructor(message, code = "NoSuchKey", status = 404, details) {
    super(message, code, status, details);
    this.name = "BYOSNotFoundError";
  }
};
var BYOSAuthError = class extends BYOSError {
  constructor(message, code = "AccessDenied", status = 403, details) {
    super(message, code, status, details);
    this.name = "BYOSAuthError";
  }
};
var BYOSQuotaError = class extends BYOSError {
  constructor(message = "Storage quota exceeded for user plan", code = "InsufficientStorage", status = 507, details) {
    super(message, code, status, details);
    this.name = "BYOSQuotaError";
  }
};
var BYOSRateLimitError = class extends BYOSError {
  retryAfter;
  constructor(message = "Rate limit exceeded", code = "RateLimitExceeded", status = 429, details) {
    super(message, code, status, details);
    this.name = "BYOSRateLimitError";
    this.retryAfter = details?.retryAfter || 60;
  }
};
function createBYOSError(status, errBody) {
  const code = errBody?.error?.code || errBody?.code || "UnknownError";
  const message = errBody?.error?.message || errBody?.message || `HTTP ${status} Error`;
  const details = errBody?.error ? { ...errBody.error, code: void 0, message: void 0 } : void 0;
  if (status === 404 || code === "NoSuchKey" || code === "NoSuchBucket" || code === "NoSuchVersion") {
    return new BYOSNotFoundError(message, code, status, details);
  }
  if (status === 401 || status === 403 || code === "InvalidApiKey" || code === "AccessDenied" || code === "MissingScope") {
    return new BYOSAuthError(message, code, status, details);
  }
  if (status === 507 || code === "InsufficientStorage" || typeof message === "string" && message.toLowerCase().includes("quota")) {
    return new BYOSQuotaError(message, code, status, details);
  }
  if (status === 429 || code === "RateLimitExceeded") {
    return new BYOSRateLimitError(message, code, status, details);
  }
  return new BYOSError(message, code, status, details);
}

// src/utils.ts
function normalizeUploadBody(data, defaultContentType) {
  let contentType = defaultContentType || "application/octet-stream";
  let body = data;
  if (data === null || data === void 0) {
    body = "";
  } else if (typeof data === "string") {
    body = data;
    if (!defaultContentType) {
      contentType = "text/plain; charset=utf-8";
    }
  } else if (typeof Blob !== "undefined" && data instanceof Blob) {
    body = data;
    if (!defaultContentType && data.type) {
      contentType = data.type;
    }
  } else if (typeof File !== "undefined" && data instanceof File) {
    body = data;
    if (!defaultContentType && data.type) {
      contentType = data.type;
    }
  }
  return { body, contentType };
}
async function withRetry(fn, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err instanceof BYOSError ? err.status : err.status;
      const isRetryableStatus = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      const isNetworkFault = !status && (err.name === "FetchError" || err.name === "TypeError" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND");
      if (!isRetryableStatus && !isNetworkFault || attempt > maxRetries) {
        throw err;
      }
      const delay = Math.min(Math.pow(2, attempt - 1) * 150 + Math.random() * 100, 5e3);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// src/client.ts
var BYOSClient = class {
  apiKey;
  bucket;
  baseUrl;
  maxRetries;
  /**
   * Initializes a new BYOS storage client.
   * @param options Client configuration options including apiKey, default bucket name, and optional custom endpoint URL.
   */
  constructor(options) {
    if (!options || !options.apiKey) {
      throw new BYOSError("An apiKey is required to initialize BYOSClient.", "InvalidConfig", 400);
    }
    this.apiKey = options.apiKey;
    this.bucket = options.bucket;
    const envUrl = typeof process !== "undefined" && process?.env ? process.env.BYOS_API_URL : void 0;
    this.baseUrl = (options.baseUrl || envUrl || "http://localhost:3000").replace(/\/$/, "");
    this.maxRetries = typeof options.maxRetries === "number" ? options.maxRetries : 3;
  }
  resolveBucket(overrideBucket) {
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
  encodeKey(key) {
    const cleaned = key.startsWith("/") ? key.slice(1) : key;
    return cleaned.split("/").map(encodeURIComponent).join("/");
  }
  async request(method, path, options) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== void 0 && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      ...options?.headers
    };
    const fetchOptions = {
      method,
      headers,
      body: options?.body
    };
    if (options?.body && (method === "PUT" || method === "POST")) {
      fetchOptions.duplex = "half";
    }
    return withRetry(async () => {
      const response = await fetch(url.toString(), fetchOptions);
      if (!response.ok) {
        let errBody = {};
        try {
          errBody = await response.json();
        } catch {
        }
        throw createBYOSError(response.status, errBody);
      }
      if (options?.isStreamResponse) {
        return response;
      }
      if (response.status === 204) {
        return void 0;
      }
      try {
        return await response.json();
      } catch {
        return void 0;
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
  async upload(key, data, options) {
    const bucket = this.resolveBucket(options?.bucket);
    const { body, contentType } = normalizeUploadBody(data, options?.contentType);
    return this.request(
      "PUT",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      {
        body,
        headers: {
          "Content-Type": contentType
        }
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
  async download(key, options) {
    const bucket = this.resolveBucket(options?.bucket);
    const headers = {};
    if (options?.range) {
      headers["Range"] = options.range;
    }
    const res = await this.request(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      {
        headers,
        isStreamResponse: true
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
        return typeof Buffer !== "undefined" ? Buffer.from(ab) : new Uint8Array(ab);
      }
    };
  }
  /**
   * Permanently deletes an object from storage. Equivalent to S3 DeleteObject.
   * Returns successfully if object existed or was already deleted (Idempotency).
   * 
   * @param key S3 object key path to delete.
   * @param options Optional target bucket override.
   */
  async delete(key, options) {
    const bucket = this.resolveBucket(options?.bucket);
    await this.request(
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
  async list(options) {
    const bucket = this.resolveBucket(options?.bucket);
    const query = {
      prefix: options?.prefix,
      maxKeys: options?.maxKeys,
      startAfter: options?.startAfter
    };
    const data = await this.request(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects`,
      { query }
    );
    return {
      name: data.Name || data.name || bucket,
      prefix: data.Prefix ?? data.prefix ?? (options?.prefix || ""),
      maxKeys: options?.maxKeys || 1e3,
      isTruncated: Boolean(data.IsTruncated ?? data.isTruncated),
      contents: (data.Contents || data.contents || []).map((item) => ({
        key: item.Key || item.key,
        size: item.Size ?? item.size ?? 0,
        etag: item.ETag || item.etag || "",
        syncStatus: item.SyncStatus || item.syncStatus || "synced",
        lastModified: typeof item.LastModified === "string" ? item.LastModified : item.LastModified?.toISOString?.() || String(item.LastModified || (/* @__PURE__ */ new Date()).toISOString())
      }))
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
  async getSignedUrl(key, options) {
    const bucket = this.resolveBucket(options.bucket);
    const body = {
      operation: options.operation,
      expiresIn: typeof options.expiresIn === "number" ? options.expiresIn : 3600
    };
    const data = await this.request(
      "POST",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/sign`,
      {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      }
    );
    return {
      url: data.url,
      grantId: data.grantId,
      expiresAt: data.expiresAt,
      operation: data.operation || options.operation
    };
  }
  /**
   * Retrieves object header metadata (size, contentType, etag) without transmitting file contents. Equivalent to S3 HeadObject.
   * 
   * @param key S3 object key path.
   * @param options Optional target bucket override.
   * @returns Promise containing metadata headers or throws BYOSNotFoundError if object does not exist.
   */
  async getMetadata(key, options) {
    const bucket = this.resolveBucket(options?.bucket);
    const res = await this.request(
      "HEAD",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}`,
      { isStreamResponse: true }
    );
    const lengthStr = res.headers.get("content-length");
    return {
      contentType: res.headers.get("content-type") || null,
      contentLength: lengthStr ? parseInt(lengthStr, 10) : null,
      etag: res.headers.get("etag") || null,
      lastModified: res.headers.get("last-modified") || null
    };
  }
  /**
   * Lists all historical archival snapshots of an object, sorted newest first.
   * 
   * @param key S3 object key path.
   * @param options Optional target bucket override.
   * @returns Promise resolving to an array of archived version records.
   */
  async listVersions(key, options) {
    const bucket = this.resolveBucket(options?.bucket);
    const data = await this.request(
      "GET",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/versions`
    );
    return {
      key: data.Key || data.key || key,
      currentVersionId: data.CurrentVersionId || data.currentVersionId || null,
      versions: (data.Versions || data.versions || []).map((v) => ({
        versionId: v.VersionId || v.versionId,
        versionNumber: v.VersionNumber ?? v.versionNumber ?? 1,
        sizeBytes: v.Size ?? v.sizeBytes ?? 0,
        etag: v.ETag || v.etag || "",
        createdAt: typeof v.CreatedAt === "string" ? v.CreatedAt : String(v.CreatedAt || "")
      }))
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
  async restoreVersion(key, versionId, options) {
    const bucket = this.resolveBucket(options?.bucket);
    return this.request(
      "POST",
      `/api/v1/buckets/${encodeURIComponent(bucket)}/objects/${this.encodeKey(key)}/versions/${String(versionId)}/restore`
    );
  }
};

// src/index.ts
var index_default = BYOSClient;
export {
  BYOSAuthError,
  BYOSClient,
  BYOSError,
  BYOSNotFoundError,
  BYOSQuotaError,
  BYOSRateLimitError,
  createBYOSError,
  index_default as default,
  normalizeUploadBody
};
