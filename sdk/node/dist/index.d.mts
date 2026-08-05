/**
 * Configuration options for initializing a BYOSClient instance.
 */
interface BYOSClientOptions {
    /**
     * Your secret BYOS API key (format: "byos_live_...").
     */
    apiKey: string;
    /**
     * Default bucket name to target for object storage requests.
     * If provided here, passing `bucket` in method options becomes optional.
     */
    bucket?: string;
    /**
     * Optional base API origin URL. Defaults to "http://localhost:3000".
     * For production, set to your deployed BYOS domain or via `BYOS_API_URL` env variable.
     */
    baseUrl?: string;
    /**
     * Maximum number of retry attempts for transient errors (429 Rate Limited or 5xx Server Errors).
     * Defaults to 3.
     */
    maxRetries?: number;
}
/**
 * Supported data formats for uploading objects to BYOS.
 * Automatically adapts to both Node.js API route streams and Edge/Browser client blobs.
 */
type UploadData = Buffer | ReadableStream | Blob | File | Uint8Array | ArrayBuffer | string;
/**
 * Options for configuring file upload operations.
 */
interface UploadOptions {
    /**
     * MIME content type of the object (e.g. "image/png" or "application/json").
     * Defaults to "application/octet-stream" if not detected from File/Blob.
     */
    contentType?: string;
    /**
     * Optional target bucket name to override the default bucket set on the client.
     */
    bucket?: string;
}
/**
 * Response returned from a successful upload operation.
 */
interface UploadResponse {
    /**
     * S3-compatible key path under which the file was stored (e.g. "avatars/user.png").
     */
    key: string;
    /**
     * MD5 hash or unique content verification identifier produced by the underlying storage provider.
     */
    etag: string;
    /**
     * Size of the uploaded object in bytes.
     */
    size: number;
    /**
     * Version identifier number if versioning is enabled on the object.
     */
    versionId: number | null;
}
/**
 * Options for configuring object download operations.
 */
interface DownloadOptions {
    /**
     * Optional target bucket name to override the default bucket set on the client.
     */
    bucket?: string;
    /**
     * HTTP Range header value for partial video or file streaming (e.g., "bytes=0-1048575").
     */
    range?: string;
}
/**
 * Rich streaming response returned from a download operation.
 * Provides intuitive helper methods for immediate consumption across Node and Browser runtime environments.
 */
interface DownloadResponse {
    /**
     * Readable stream of the downloaded bytes, suitable for piping directly into responses or file writable streams.
     */
    stream: ReadableStream | null;
    /**
     * MIME content-type header returned by storage provider.
     */
    contentType: string | null;
    /**
     * Total length of content payload in bytes, if provided by headers.
     */
    contentLength: number | null;
    /**
     * ETag hash identifier of downloaded content.
     */
    etag: string | null;
    /**
     * Date timestamp of when the object was last modified in storage.
     */
    lastModified?: string | null;
    /**
     * Helper method that buffers the entire stream into a standard Web Blob (ideal for browser displaying).
     */
    blob(): Promise<Blob>;
    /**
     * Helper method that buffers the entire stream into an ArrayBuffer.
     */
    arrayBuffer(): Promise<ArrayBuffer>;
    /**
     * Helper method that decodes the entire stream into a UTF-8 string (ideal for text/JSON artifacts).
     */
    text(): Promise<string>;
    /**
     * Helper method that decodes the entire stream into a Node.js Buffer.
     */
    buffer(): Promise<Buffer>;
}
/**
 * Options for listing objects within a storage bucket.
 */
interface ListOptions {
    /**
     * Filter object keys starting with this prefix (e.g. "documents/2026/").
     */
    prefix?: string;
    /**
     * Maximum number of objects to return in a single page request. Defaults to 1000.
     */
    maxKeys?: number;
    /**
     * Pagination cursor indicating to return keys starting after this specific key name.
     */
    startAfter?: string;
    /**
     * Optional target bucket name to override the default bucket set on the client.
     */
    bucket?: string;
}
/**
 * Individual storage item returned in a bucket list response.
 */
interface ObjectItem {
    /**
     * Full object key path.
     */
    key: string;
    /**
     * File size in bytes.
     */
    size: number;
    /**
     * ETag integrity checksum.
     */
    etag: string;
    /**
     * Synchronization state against underlying Google Drive storage ("synced", "missing_in_provider", or "discovered").
     */
    syncStatus?: string;
    /**
     * ISO string representation of when object was last updated or indexed.
     */
    lastModified: string;
}
/**
 * S3-compatible paginated listing response format.
 */
interface ListObjectsResponse {
    /**
     * Name of the bucket queried.
     */
    name: string;
    /**
     * Prefix filter applied during query.
     */
    prefix: string;
    /**
     * Max keys pagination limit.
     */
    maxKeys: number;
    /**
     * True if more matching keys exist beyond this response page; false otherwise.
     */
    isTruncated: boolean;
    /**
     * Array of matching object descriptors.
     */
    contents: ObjectItem[];
}
/**
 * Options for generating presigned client access URLs.
 */
interface SignOptions {
    /**
     * Intended operation to authorize ("get" for downloads/views, "put" for direct end-user file uploads).
     */
    operation: "get" | "put";
    /**
     * Duration in seconds until the cryptographic signature expires. Maximum is 604800 (7 days). Defaults to 3600 (1 hour).
     */
    expiresIn?: number;
    /**
     * Optional target bucket name to override the default bucket set on the client.
     */
    bucket?: string;
}
/**
 * Response containing a short-lived presigned authorization link.
 */
interface SignResponse {
    /**
     * Full authenticated URL ready for client browser fetches or PUT uploads.
     */
    url: string;
    /**
     * Unique audit grant identifier for immediate revocation if needed.
     */
    grantId?: string;
    /**
     * ISO string timestamp indicating exact expiration time.
     */
    expiresAt: string;
    /**
     * Authorized operation type.
     */
    operation: "get" | "put";
}
/**
 * Metadata descriptors retrieved without downloading file contents.
 */
interface MetadataResponse {
    /**
     * MIME Content-Type of object.
     */
    contentType: string | null;
    /**
     * Size in bytes.
     */
    contentLength: number | null;
    /**
     * ETag signature hash.
     */
    etag: string | null;
    /**
     * Last modified timestamp header string.
     */
    lastModified: string | null;
}
/**
 * Item representing a specific historical snapshot version of an object.
 */
interface VersionItem {
    /**
     * Unique UUID of this version snapshot.
     */
    versionId: string;
    /**
     * Sequential version number index.
     */
    versionNumber: number;
    /**
     * Size of version file in bytes.
     */
    sizeBytes: number;
    /**
     * ETag checksum of this historic file.
     */
    etag: string;
    /**
     * Date string when this version was created.
     */
    createdAt: string;
}
/**
 * Response listing all retained historical version snapshots of an object.
 */
interface ListVersionsResponse {
    /**
     * Object key path.
     */
    key: string;
    /**
     * UUID of current active version.
     */
    currentVersionId?: string | null;
    /**
     * Array of versions in reverse chronological order (newest first).
     */
    versions: VersionItem[];
}
/**
 * Response returned after restoring an archived historical version to become the new current version.
 */
interface RestoreVersionResponse {
    key: string;
    etag: string;
    size: number;
    versionId: number | null;
    restoredFromVersionId: string;
}

/**
 * Base error class for all exceptions thrown by the BYOS SDK.
 */
declare class BYOSError extends Error {
    readonly code: string;
    readonly status?: number;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code?: string, status?: number, details?: Record<string, unknown>);
}
/**
 * Thrown when an object, version, or bucket cannot be found (404 / NoSuchKey / NoSuchBucket).
 */
declare class BYOSNotFoundError extends BYOSError {
    constructor(message: string, code?: string, status?: number, details?: Record<string, unknown>);
}
/**
 * Thrown when authentication fails or permissions/scopes are insufficient (401 / 403 / AccessDenied).
 */
declare class BYOSAuthError extends BYOSError {
    constructor(message: string, code?: string, status?: number, details?: Record<string, unknown>);
}
/**
 * Thrown when a storage quota or active key limit is exceeded (507 / InsufficientStorage).
 */
declare class BYOSQuotaError extends BYOSError {
    constructor(message?: string, code?: string, status?: number, details?: Record<string, unknown>);
}
/**
 * Thrown when rate limiting restricts request frequency (429 / RateLimitExceeded).
 */
declare class BYOSRateLimitError extends BYOSError {
    readonly retryAfter?: number;
    constructor(message?: string, code?: string, status?: number, details?: Record<string, unknown> & {
        retryAfter?: number;
    });
}
/**
 * Parses raw HTTP response error bodies and returns an instance of the most appropriate typed exception.
 */
declare function createBYOSError(status: number, errBody: any): BYOSError;

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
declare class BYOSClient {
    private readonly apiKey;
    private readonly bucket?;
    private readonly baseUrl;
    private readonly maxRetries;
    /**
     * Initializes a new BYOS storage client.
     * @param options Client configuration options including apiKey, default bucket name, and optional custom endpoint URL.
     */
    constructor(options: BYOSClientOptions);
    private resolveBucket;
    private encodeKey;
    private request;
    /**
     * Uploads an object to storage. Equivalent to S3 PutObject.
     * Supports Node Buffer/Streams, browser File/Blob instances, Uint8Array, and text strings.
     *
     * @param key S3 object key path (e.g. "images/logo.png").
     * @param data File payload to store.
     * @param options Optional metadata overrides (contentType, target bucket).
     * @returns Promise containing verified ETag checksum, uploaded bytes size, and versionId.
     */
    upload(key: string, data: UploadData, options?: UploadOptions): Promise<UploadResponse>;
    /**
     * Downloads an object from storage with streaming support. Equivalent to S3 GetObject.
     * Supports Range headers for partial content retrieval and video streaming.
     *
     * @param key S3 object key path to download.
     * @param options Optional overrides (target bucket, HTTP Range header string).
     * @returns Promise resolving to a DownloadResponse stream with helpful extraction utilities (.text(), .blob(), .buffer(), .arrayBuffer()).
     */
    download(key: string, options?: DownloadOptions): Promise<DownloadResponse>;
    /**
     * Permanently deletes an object from storage. Equivalent to S3 DeleteObject.
     * Returns successfully if object existed or was already deleted (Idempotency).
     *
     * @param key S3 object key path to delete.
     * @param options Optional target bucket override.
     */
    delete(key: string, options?: {
        bucket?: string;
    }): Promise<void>;
    /**
     * Lists objects within a bucket with pagination and prefix filtering. Equivalent to S3 ListObjectsV2.
     * Surfaces synchronization health status (`syncStatus`) against Google Drive.
     *
     * @param options Optional configuration for filtering prefix, pagination maxKeys (default 1000), and cursor startAfter.
     * @returns Promise containing matching items and truncation continuation flags.
     */
    list(options?: ListOptions): Promise<ListObjectsResponse>;
    /**
     * Generates a secure presigned access URL for direct end-user file viewing or uploading. Equivalent to S3 getSignedUrl.
     * Eliminates the need to proxy bandwidth through backend servers for large file transfer scale.
     *
     * @param key S3 object key path to authorize access for.
     * @param options Required configuration specifying operation ("get" or "put") and expiration time in seconds (max 7 days).
     * @returns Promise containing the authenticated signed link and timestamp parameters.
     */
    getSignedUrl(key: string, options: SignOptions): Promise<SignResponse>;
    /**
     * Retrieves object header metadata (size, contentType, etag) without transmitting file contents. Equivalent to S3 HeadObject.
     *
     * @param key S3 object key path.
     * @param options Optional target bucket override.
     * @returns Promise containing metadata headers or throws BYOSNotFoundError if object does not exist.
     */
    getMetadata(key: string, options?: {
        bucket?: string;
    }): Promise<MetadataResponse>;
    /**
     * Lists all historical archival snapshots of an object, sorted newest first.
     *
     * @param key S3 object key path.
     * @param options Optional target bucket override.
     * @returns Promise resolving to an array of archived version records.
     */
    listVersions(key: string, options?: {
        bucket?: string;
    }): Promise<ListVersionsResponse>;
    /**
     * Restores a past historical version snapshot to become the newly active current version.
     * To prevent underlying cloud garbage collection, this duplicates the content blob rather than moving pointers.
     *
     * @param key S3 object key path.
     * @param versionId The UUID of the historical version to restore.
     * @param options Optional target bucket override.
     * @returns Promise containing the new version upload metadata.
     */
    restoreVersion(key: string, versionId: string | number, options?: {
        bucket?: string;
    }): Promise<RestoreVersionResponse>;
}

/**
 * Normalizes input payloads across Node.js (Buffers, Streams) and Browser (Blobs, Files, Strings) runtimes.
 * Automatically extracts content metadata when available.
 */
declare function normalizeUploadBody(data: UploadData, defaultContentType?: string): {
    body: BodyInit | null | undefined;
    contentType: string;
};

export { BYOSAuthError, BYOSClient, type BYOSClientOptions, BYOSError, BYOSNotFoundError, BYOSQuotaError, BYOSRateLimitError, type DownloadOptions, type DownloadResponse, type ListObjectsResponse, type ListOptions, type ListVersionsResponse, type MetadataResponse, type ObjectItem, type RestoreVersionResponse, type SignOptions, type SignResponse, type UploadData, type UploadOptions, type UploadResponse, type VersionItem, createBYOSError, BYOSClient as default, normalizeUploadBody };
