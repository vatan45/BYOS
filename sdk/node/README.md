# BYOS SDK (`byos-sdk`)

Official TypeScript / Node.js Developer SDK for **BYOS (Bring Your Own Storage)** — turn standard Google Drive storage accounts into drop-in, S3-compatible cloud object storage.

## Installation

```bash
npm install byos-sdk
```

*(Zero runtime dependencies! Lightweight, Edge-ready, and works out of the box in Node.js 18+, Next.js API routes, Cloudflare Workers, and modern web browsers.)*

---

## Quick Start (5 Lines to First Upload)

```typescript
import BYOSClient from "byos-sdk";

const byos = new BYOSClient({ apiKey: "byos_live_xxx", bucket: "my-bucket" });

// Upload any string, Buffer, Blob, File, or ReadableStream instantly:
const res = await byos.upload("avatars/user.png", myFileBuffer, { contentType: "image/png" });
console.log("Uploaded object ETag:", res.etag);
```

---

## Migration Guide (`@aws-sdk/client-s3` ➜ `byos-sdk`)

Replacing cumbersome AWS SDK command objects with `byos-sdk` reduces boilerplate code by up to 80% while retaining familiar method arguments and behaviors.

| Operation | `@aws-sdk/client-s3` (AWS S3) | `byos-sdk` (BYOS) |
| :--- | :--- | :--- |
| **Initialize Client** | `new S3Client({ region: "us-east-1", credentials: { ... } })` | `new BYOSClient({ apiKey: "byos_live_...", bucket: "my-bucket" })` |
| **PutObjectCommand** | `await s3.send(new PutObjectCommand({ Bucket: "b", Key: "k", Body: buf, ContentType: "image/png" }))` | `await byos.upload("k", buf, { contentType: "image/png" })` |
| **GetObjectCommand** | `const res = await s3.send(new GetObjectCommand({ Bucket: "b", Key: "k" })); `<br>`const str = await res.Body.transformToString();` | `const res = await byos.download("k"); `<br>`const str = await res.text();` |
| **DeleteObjectCommand**| `await s3.send(new DeleteObjectCommand({ Bucket: "b", Key: "k" }))` | `await byos.delete("k")` |
| **ListObjectsV2Command**| `await s3.send(new ListObjectsV2Command({ Bucket: "b", Prefix: "p/", MaxKeys: 100 }))` | `await byos.list({ prefix: "p/", maxKeys: 100 })` |
| **getSignedUrl** | `await getSignedUrl(s3, new GetObjectCommand({ Bucket: "b", Key: "k" }), { expiresIn: 3600 })` | `await byos.getSignedUrl("k", { operation: "get", expiresIn: 3600 })` |

---

## Advanced Features & Capabilities

### 1. Robust Exponential Backoff Retries
By default, the client handles rate limits (`429 Too Many Requests`) and temporary network service disturbances (`500/502/503/504`) with automatic exponential backoff and randomized jitter (configurable up to `maxRetries: 3` attempts).

### 2. Typed Exception Hierarchy
Easily handle different failure modes using specialized subclasses extending `BYOSError`:
```typescript
import BYOSClient, { BYOSNotFoundError, BYOSAuthError, BYOSQuotaError } from "byos-sdk";

try {
  await byos.download("non-existent-file.png");
} catch (err) {
  if (err instanceof BYOSNotFoundError) {
    console.error("File is missing in storage (404 / NoSuchKey):", err.message);
  } else if (err instanceof BYOSQuotaError) {
    console.error("Plan storage limit exceeded (507):", err.message);
  } else if (err instanceof BYOSAuthError) {
    console.error("Invalid API token or insufficient scopes (401/403):", err.message);
  }
}
```

### 3. Historical Object Versioning & Restoration
Easily list or restore archived revisions without worrying about cloud garbage collection:
```typescript
// 1. Inspect version history
const history = await byos.listVersions("config.json");

// 2. Restore an older snapshot as the brand new active version
if (history.versions.length > 1) {
  await byos.restoreVersion("config.json", history.versions[1].versionId);
}
```

### 4. Seamless Runtime Compatibility
- **In Node.js:** Pass standard `Buffer` or `fs.createReadStream()` streams into `upload()` and read outputs using `.buffer()`.
- **In Browser / Edge:** Pass standard HTML `<input type="file" />` `File`, `Blob`, or text strings directly into `upload()` and read outputs using `.blob()` or `.arrayBuffer()`.
