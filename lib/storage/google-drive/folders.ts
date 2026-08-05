import { drive_v3 } from "googleapis";
import { db } from "@/lib/db/client";
import { folderPathCache } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Resolves or creates the entire folder chain for an S3-style key path.
 * For example, given key "images/avatars/user1.png", this resolves/creates:
 *   rootFolderId -> "images" -> "avatars"
 * and returns the final folder ID where "user1.png" should be uploaded.
 *
 * Uses the folder_path_cache table to avoid redundant Drive API calls.
 */
export async function resolveOrCreateFolderPath(
  drive: drive_v3.Drive,
  bucketId: string,
  rootFolderId: string,
  key: string
): Promise<string> {
  const parts = key.split("/");
  // The last part is the filename, we only need folders
  if (parts.length <= 1) return rootFolderId;

  const folderParts = parts.slice(0, -1);
  const fullPath = folderParts.join("/");

  // Check cache for the full path first (fast path)
  const cached = await db.query.folderPathCache.findFirst({
    where: and(
      eq(folderPathCache.bucketId, bucketId),
      eq(folderPathCache.path, fullPath)
    ),
  });

  if (cached) return cached.providerFolderId;

  // Walk incrementally, checking cache at each level
  let currentParentId = rootFolderId;
  let currentPath = "";

  for (const folderName of folderParts) {
    currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    // Check cache for this partial path
    const partialCached = await db.query.folderPathCache.findFirst({
      where: and(
        eq(folderPathCache.bucketId, bucketId),
        eq(folderPathCache.path, currentPath)
      ),
    });

    if (partialCached) {
      currentParentId = partialCached.providerFolderId;
      continue;
    }

    // Search Drive for existing folder
    const searchRes = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${currentParentId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    let folderId: string;

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id!;
    } else {
      // Create folder
      const createRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [currentParentId],
        },
        fields: "id",
      });
      folderId = createRes.data.id!;
    }

    // Cache the mapping
    await db
      .insert(folderPathCache)
      .values({
        bucketId,
        path: currentPath,
        providerFolderId: folderId,
      })
      .onConflictDoUpdate({
        target: [folderPathCache.bucketId, folderPathCache.path],
        set: { providerFolderId: folderId },
      });

    currentParentId = folderId;
  }

  return currentParentId;
}

/**
 * Extracts the filename from an S3-style key.
 * e.g. "images/avatars/user1.png" -> "user1.png"
 */
export function getFileName(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1];
}
