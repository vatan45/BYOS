import { GoogleDriveProvider } from "@/lib/storage/google-drive/provider";
import type { StorageProvider } from "@/lib/storage/provider";

/**
 * Resolves the storage provider for a given connection.
 * Currently always returns GoogleDriveProvider; in the future,
 * this will look up the connection's provider type and return the appropriate class.
 */
export function getProvider(connectionId: string): StorageProvider {
  return new GoogleDriveProvider(connectionId);
}
