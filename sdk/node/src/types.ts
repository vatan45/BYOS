/**
 * Configuration options for initializing a BYOSClient instance.
 */
export interface BYOSClientOptions {
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
export type UploadData =
  | Buffer
  | ReadableStream
  | Blob
  | File
  | Uint8Array
  | ArrayBuffer
  | string;

/**
 * Options for configuring file upload operations.
 */
export interface UploadOptions {
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
export interface UploadResponse {
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
export interface DownloadOptions {
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
export interface DownloadResponse {
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
export interface ListOptions {
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
export interface ObjectItem {
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
export interface ListObjectsResponse {
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
export interface SignOptions {
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
export interface SignResponse {
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
export interface MetadataResponse {
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
export interface VersionItem {
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
export interface ListVersionsResponse {
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
export interface RestoreVersionResponse {
  key: string;
  etag: string;
  size: number;
  versionId: number | null;
  restoredFromVersionId: string;
}
