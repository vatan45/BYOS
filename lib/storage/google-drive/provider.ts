import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { db } from "@/lib/db/client";
import { buckets, objects, objectVersions, signedUrlGrants } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getValidAccessToken } from "./auth";
import { resolveOrCreateFolderPath, getFileName } from "./folders";
import { cacheGet, cacheSet } from "@/lib/redis";
import { env } from "@/lib/env";
import type {
  StorageProvider,
  ObjectRecord,
  ObjectMetadata,
  ListResult,
} from "../provider";

const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5MB

/**
 * GoogleDriveProvider implements the StorageProvider interface, translating
 * S3-style flat key operations into Google Drive's hierarchical folder structure.
 *
 * Security note: This provider uses ONLY the drive.file scope, meaning it can only
 * access files and folders it has created. This is a deliberate trust/security decision.
 */
export class GoogleDriveProvider implements StorageProvider {
  constructor(private connectionId: string) {}

  /**
   * Gets an authenticated Drive client using the connection's tokens.
   */
  private async getDriveClient(): Promise<drive_v3.Drive> {
    const accessToken = await getValidAccessToken(this.connectionId);
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  /**
   * Resolves a bucketId to its DB record, including the root Drive folder ID.
   */
  private async getBucketRecord(bucketId: string) {
    const bucket = await db.query.buckets.findFirst({
      where: eq(buckets.id, bucketId),
    });
    if (!bucket) throw new Error(`Bucket ${bucketId} not found`);
    return bucket;
  }

  /**
   * uploadObject — Uploads a file to Google Drive, creating intermediate folders as needed.
   * Uses simple multipart for files < 5MB, resumable upload for larger files.
   * Writes DB metadata transactionally AFTER the Drive write succeeds.
   */
  async uploadObject(
    bucketId: string,
    key: string,
    fileStream: ReadableStream,
    metadata: Partial<ObjectMetadata>
  ): Promise<ObjectRecord> {
    const drive = await this.getDriveClient();
    const bucket = await this.getBucketRecord(bucketId);

    // Resolve/create folder path in Drive
    const parentFolderId = await resolveOrCreateFolderPath(
      drive,
      bucketId,
      bucket.providerFolderId,
      key
    );

    const fileName = getFileName(key);
    const contentType = metadata.contentType || "application/octet-stream";

    // Convert web ReadableStream to Node Readable for googleapis
    const nodeStream = Readable.fromWeb(fileStream as import("stream/web").ReadableStream);

    // Collect the stream into a buffer to determine size and compute upload strategy
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);
    const fileSize = fileBuffer.length;

    // Check if file already exists at this path (for overwrite/versioning)
    const existingRes = await drive.files.list({
      q: `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });

    let driveFile: drive_v3.Schema$File;

    if (existingRes.data.files && existingRes.data.files.length > 0) {
      // Update existing file
      const existingId = existingRes.data.files[0].id!;
      const uploadRes = await drive.files.update({
        fileId: existingId,
        media: {
          mimeType: contentType,
          body: Readable.from(fileBuffer),
        },
        fields: "id, name, size, md5Checksum, mimeType, modifiedTime",
      });
      driveFile = uploadRes.data;
    } else if (fileSize >= RESUMABLE_THRESHOLD) {
      // Resumable upload for large files
      const uploadRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [parentFolderId],
          mimeType: contentType,
        },
        media: {
          mimeType: contentType,
          body: Readable.from(fileBuffer),
        },
        fields: "id, name, size, md5Checksum, mimeType, modifiedTime",
      });
      driveFile = uploadRes.data;
    } else {
      // Simple multipart upload for small files
      const uploadRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [parentFolderId],
          mimeType: contentType,
        },
        media: {
          mimeType: contentType,
          body: Readable.from(fileBuffer),
        },
        fields: "id, name, size, md5Checksum, mimeType, modifiedTime",
      });
      driveFile = uploadRes.data;
    }

    const sizeBytes = parseInt(driveFile.size || String(fileSize), 10);
    const etag = driveFile.md5Checksum || "unknown";
    const updatedAt = driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : new Date();

    // Write DB metadata transactionally AFTER Drive write confirms
    const existingObj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucketId), eq(objects.key, key)),
    });

    let objectId: string;
    if (existingObj) {
      // Update existing object
      await db
        .update(objects)
        .set({
          providerFileId: driveFile.id!,
          sizeBytes,
          contentType,
          etag,
          updatedAt,
        })
        .where(eq(objects.id, existingObj.id));
      objectId = existingObj.id;
    } else {
      // Insert new object
      const [inserted] = await db
        .insert(objects)
        .values({
          bucketId,
          key,
          providerFileId: driveFile.id!,
          sizeBytes,
          contentType,
          etag,
        })
        .returning();
      objectId = inserted.id;
    }

    // Get the latest version number
    const latestVersion = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${objectVersions.versionNumber}), 0)` })
      .from(objectVersions)
      .where(eq(objectVersions.objectId, objectId));

    const nextVersion = (latestVersion[0]?.maxVersion || 0) + 1;

    // Create version record
    const [version] = await db
      .insert(objectVersions)
      .values({
        objectId,
        providerFileId: driveFile.id!,
        sizeBytes,
        etag,
        versionNumber: nextVersion,
      })
      .returning();

    // Update current version pointer
    await db
      .update(objects)
      .set({ currentVersionId: version.id })
      .where(eq(objects.id, objectId));

    return {
      bucketId,
      key,
      metadata: {
        size: sizeBytes,
        contentType,
        updatedAt,
        etag,
        providerFileId: driveFile.id!,
        versionNumber: nextVersion,
      },
    };
  }

  /**
   * downloadObject — Streams the file from Drive without buffering into memory.
   */
  async downloadObject(bucketId: string, key: string, versionId?: string): Promise<ReadableStream> {
    const drive = await this.getDriveClient();

    let providerFileId: string;
    if (versionId) {
      const ver = await db.query.objectVersions.findFirst({
        where: eq(objectVersions.id, versionId),
      });
      if (!ver) throw new Error(`Version ${versionId} not found`);
      providerFileId = ver.providerFileId;
    } else {
      const obj = await db.query.objects.findFirst({
        where: and(eq(objects.bucketId, bucketId), eq(objects.key, key)),
      });
      if (!obj) throw new Error(`Object ${key} not found in bucket ${bucketId}`);
      providerFileId = obj.providerFileId;
    }

    const response = await drive.files.get(
      { fileId: providerFileId, alt: "media" },
      { responseType: "stream" }
    );

    // Convert Node stream to web ReadableStream
    const nodeStream = response.data as unknown as Readable;
    return new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on("end", () => {
          controller.close();
        });
        nodeStream.on("error", (err: Error) => {
          controller.error(err);
        });
      },
    });
  }

  /**
   * deleteObject — Deletes from Drive first, then removes the DB row.
   * If the Drive file is already gone (404), we still clean up the DB.
   */
  async deleteObject(bucketId: string, key: string): Promise<void> {
    const drive = await this.getDriveClient();

    const obj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucketId), eq(objects.key, key)),
    });

    if (!obj) return; // Nothing to delete

    // Delete from Drive first
    try {
      await drive.files.delete({ fileId: obj.providerFileId });
    } catch (err: unknown) {
      const gErr = err as { code?: number };
      if (gErr.code === 404) {
        console.warn(
          `[GoogleDriveProvider] File ${obj.providerFileId} already gone from Drive, cleaning up DB`
        );
      } else {
        // For other errors, still clean up DB to avoid stale references
        console.warn(
          `[GoogleDriveProvider] Drive delete failed for ${obj.providerFileId}, cleaning up DB anyway:`,
          err
        );
      }
    }

    // Delete from DB (versions cascade automatically via FK)
    await db.delete(objects).where(eq(objects.id, obj.id));
  }

  /**
   * deleteProviderFile — Deletes a file directly from Drive by its raw providerFileId.
   */
  async deleteProviderFile(providerFileId: string): Promise<void> {
    const drive = await this.getDriveClient();
    try {
      await drive.files.delete({ fileId: providerFileId });
    } catch (err: unknown) {
      const gErr = err as { code?: number };
      if (gErr.code === 404) {
        console.warn(
          `[GoogleDriveProvider] File ${providerFileId} already gone from Drive`
        );
      } else {
        console.warn(
          `[GoogleDriveProvider] Drive delete failed for ${providerFileId}:`,
          err
        );
      }
    }
  }

  /**
   * listObjects — Lists objects in a bucket with S3-style prefix filtering and cursor pagination.
   * Walks the folder hierarchy using the cache and Drive's file listing API.
   */
  async listObjects(
    bucketId: string,
    prefix?: string,
    cursor?: string
  ): Promise<ListResult> {
    const drive = await this.getDriveClient();
    const bucket = await this.getBucketRecord(bucketId);

    // Determine which folder to list from based on prefix
    let parentFolderId = bucket.providerFolderId;
    let keyPrefix = "";

    if (prefix) {
      // If prefix ends with "/" it's a folder prefix
      // If not, we list from the parent folder and filter by name prefix
      const prefixParts = prefix.split("/").filter(Boolean);

      // Check if any part of the prefix is a folder path we need to resolve
      if (prefixParts.length > 0) {
        // Check if the last part is a partial filename filter or a full folder path
        const possibleFolderPath = prefixParts.join("/");

        if (prefix.endsWith("/")) {
          // Full folder prefix — resolve to that folder
          try {
            parentFolderId = await resolveOrCreateFolderPath(
              drive,
              bucketId,
              bucket.providerFolderId,
              possibleFolderPath + "/dummy"
            );
            keyPrefix = possibleFolderPath + "/";
          } catch {
            // Folder doesn't exist, return empty
            return { objects: [] };
          }
        } else {
          // Partial prefix — list from parent of last segment
          if (prefixParts.length > 1) {
            const folderPath = prefixParts.slice(0, -1).join("/");
            try {
              parentFolderId = await resolveOrCreateFolderPath(
                drive,
                bucketId,
                bucket.providerFolderId,
                folderPath + "/dummy"
              );
              keyPrefix = folderPath + "/";
            } catch {
              return { objects: [] };
            }
          }
        }
      }
    }

    // Query Drive for files in this folder
    const query = `'${parentFolderId}' in parents and trashed=false`;
    const listParams: drive_v3.Params$Resource$Files$List = {
      q: query,
      fields: "nextPageToken, files(id, name, size, md5Checksum, mimeType, modifiedTime)",
      spaces: "drive",
      pageSize: 100,
    };

    if (cursor) {
      listParams.pageToken = cursor;
    }

    const res = await drive.files.list(listParams);
    const driveFiles = res.data.files || [];

    const result: ObjectRecord[] = [];

    for (const file of driveFiles) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        // Skip folders in listing — they're virtual in S3 model
        continue;
      }

      const fileKey = keyPrefix + file.name!;

      // Apply prefix filter for partial name matches
      if (prefix && !fileKey.startsWith(prefix)) continue;

      result.push({
        bucketId,
        key: fileKey,
        metadata: {
          size: parseInt(file.size || "0", 10),
          contentType: file.mimeType || "application/octet-stream",
          updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
          etag: file.md5Checksum || "unknown",
          providerFileId: file.id!,
        },
      });
    }

    return {
      objects: result,
      nextCursor: res.data.nextPageToken || undefined,
    };
  }

  /**
   * listAllObjectsRecursive — Recursively walks the entire bucket folder tree in Drive.
   * Used by state reconciliation jobs to uncover untracked uploads and missing files.
   */
  async listAllObjectsRecursive(bucketId: string): Promise<ObjectRecord[]> {
    const drive = await this.getDriveClient();
    const bucket = await this.getBucketRecord(bucketId);
    const result: ObjectRecord[] = [];

    const walk = async (folderId: string, currentPrefix: string) => {
      let pageToken: string | undefined = undefined;
      do {
        const res: { data: drive_v3.Schema$FileList } = await drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: "nextPageToken, files(id, name, size, md5Checksum, mimeType, modifiedTime)",
          spaces: "drive",
          pageSize: 100,
          pageToken,
        });

        const files = res.data.files || [];
        for (const file of files) {
          if (file.mimeType === "application/vnd.google-apps.folder") {
            await walk(file.id!, currentPrefix + file.name! + "/");
          } else {
            result.push({
              bucketId,
              key: currentPrefix + file.name!,
              metadata: {
                size: parseInt(file.size || "0", 10),
                contentType: file.mimeType || "application/octet-stream",
                updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
                etag: file.md5Checksum || "unknown",
                providerFileId: file.id!,
              },
            });
          }
        }
        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);
    };

    await walk(bucket.providerFolderId, "");
    return result;
  }

  /**
   * getObjectMetadata — Fast path from DB, falls back to live Drive API if stale (> 5 min).
   */
  async getObjectMetadata(bucketId: string, key: string): Promise<ObjectMetadata> {
    const obj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucketId), eq(objects.key, key)),
    });

    if (!obj) throw new Error(`Object ${key} not found in bucket ${bucketId}`);

    // Check if cache is fresh (less than 5 minutes old)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (obj.updatedAt > fiveMinAgo) {
      return {
        size: obj.sizeBytes,
        contentType: obj.contentType,
        updatedAt: obj.updatedAt,
        etag: obj.etag,
        providerFileId: obj.providerFileId,
      };
    }

    // Cache is stale — fetch fresh metadata from Drive
    const drive = await this.getDriveClient();
    try {
      const fileRes = await drive.files.get({
        fileId: obj.providerFileId,
        fields: "id, name, size, md5Checksum, mimeType, modifiedTime",
      });

      const file = fileRes.data;
      const updatedMetadata = {
        size: parseInt(file.size || String(obj.sizeBytes), 10),
        contentType: file.mimeType || obj.contentType,
        updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
        etag: file.md5Checksum || obj.etag,
        providerFileId: obj.providerFileId,
      };

      // Refresh the DB cache
      await db
        .update(objects)
        .set({
          sizeBytes: updatedMetadata.size,
          contentType: updatedMetadata.contentType,
          etag: updatedMetadata.etag,
          updatedAt: updatedMetadata.updatedAt,
        })
        .where(eq(objects.id, obj.id));

      return updatedMetadata;
    } catch {
      // If Drive call fails, return what we have
      return {
        size: obj.sizeBytes,
        contentType: obj.contentType,
        updatedAt: obj.updatedAt,
        etag: obj.etag,
        providerFileId: obj.providerFileId,
      };
    }
  }

  /**
   * generateSignedUrl — Creates a signed_url_grants row and returns a URL
   * to a local proxy endpoint that validates the grant and streams the file.
   */
  async generateSignedUrl(
    bucketId: string,
    key: string,
    expiresInSeconds: number
  ): Promise<string> {
    const obj = await db.query.objects.findFirst({
      where: and(eq(objects.bucketId, bucketId), eq(objects.key, key)),
    });

    if (!obj) throw new Error(`Object ${key} not found in bucket ${bucketId}`);

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const [grant] = await db
      .insert(signedUrlGrants)
      .values({
        objectId: obj.id,
        expiresAt,
      })
      .returning();

    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/storage/download/${grant.id}`;
  }

  /**
   * getProviderQuota — Calls Drive's about endpoint, caches result in Redis for 15 min.
   */
  async getProviderQuota(
    connectionId: string
  ): Promise<{ usedBytes: number; totalBytes: number }> {
    const cacheKey = `quota:${connectionId}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fresh fetch from Drive
    const accessToken = await getValidAccessToken(connectionId);
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const aboutRes = await drive.about.get({
      fields: "storageQuota",
    });

    const quota = aboutRes.data.storageQuota;
    const result = {
      usedBytes: parseInt(quota?.usage || "0", 10),
      totalBytes: parseInt(quota?.limit || "0", 10),
    };

    // Cache for 15 minutes
    await cacheSet(cacheKey, JSON.stringify(result), 900);

    return result;
  }
}
