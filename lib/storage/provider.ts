export interface ObjectMetadata {
  size: number;
  contentType: string;
  updatedAt: Date;
  [key: string]: unknown;
}

export interface ObjectRecord {
  bucketId: string;
  key: string;
  metadata: ObjectMetadata;
}

export interface ListResult {
  objects: ObjectRecord[];
  nextCursor?: string;
}

export interface StorageProvider {
  uploadObject(
    bucketId: string,
    key: string,
    fileStream: ReadableStream,
    metadata: Partial<ObjectMetadata>
  ): Promise<ObjectRecord>;

  downloadObject(bucketId: string, key: string, versionId?: string): Promise<ReadableStream>;

  deleteObject(bucketId: string, key: string): Promise<void>;

  deleteProviderFile(providerFileId: string): Promise<void>;

  listObjects(
    bucketId: string,
    prefix?: string,
    cursor?: string
  ): Promise<ListResult>;

  listAllObjectsRecursive(bucketId: string): Promise<ObjectRecord[]>;

  getObjectMetadata(bucketId: string, key: string): Promise<ObjectMetadata>;

  generateSignedUrl(
    bucketId: string,
    key: string,
    expiresInSeconds: number
  ): Promise<string>;

  getProviderQuota(connectionId: string): Promise<{
    usedBytes: number;
    totalBytes: number;
  }>;
}

export class InMemoryProvider implements StorageProvider {
  private storage = new Map<
    string,
    { stream: ReadableStream; metadata: ObjectMetadata }
  >();

  private getMapKey(bucketId: string, key: string) {
    return `${bucketId}:${key}`;
  }

  async uploadObject(
    bucketId: string,
    key: string,
    fileStream: ReadableStream,
    metadata: Partial<ObjectMetadata>
  ): Promise<ObjectRecord> {
    const mapKey = this.getMapKey(bucketId, key);
    const fullMetadata: ObjectMetadata = {
      size: metadata.size || 0,
      contentType: metadata.contentType || "application/octet-stream",
      updatedAt: new Date(),
      ...metadata,
    };
    this.storage.set(mapKey, { stream: fileStream, metadata: fullMetadata });
    return { bucketId, key, metadata: fullMetadata };
  }

  async downloadObject(
    bucketId: string,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _versionId?: string
  ): Promise<ReadableStream> {
    const mapKey = this.getMapKey(bucketId, key);
    const obj = this.storage.get(mapKey);
    if (!obj) throw new Error("Object not found");
    return obj.stream;
  }

  async deleteObject(bucketId: string, key: string): Promise<void> {
    this.storage.delete(this.getMapKey(bucketId, key));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteProviderFile(_providerFileId: string): Promise<void> {
    // No-op for InMemoryProvider
  }

  async listObjects(
    bucketId: string,
    prefix?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _cursor?: string
  ): Promise<ListResult> {
    const objects: ObjectRecord[] = [];
    for (const [mapKey, obj] of Array.from(this.storage.entries())) {
      const [bId, k] = mapKey.split(":");
      if (bId === bucketId && (!prefix || k.startsWith(prefix))) {
        objects.push({ bucketId: bId, key: k, metadata: obj.metadata });
      }
    }
    return { objects };
  }

  async listAllObjectsRecursive(bucketId: string): Promise<ObjectRecord[]> {
    const { objects } = await this.listObjects(bucketId);
    return objects;
  }

  async getObjectMetadata(
    bucketId: string,
    key: string
  ): Promise<ObjectMetadata> {
    const mapKey = this.getMapKey(bucketId, key);
    const obj = this.storage.get(mapKey);
    if (!obj) throw new Error("Object not found");
    return obj.metadata;
  }

  async generateSignedUrl(
    bucketId: string,
    key: string,
    expiresInSeconds: number
  ): Promise<string> {
    return `http://localhost:3000/mock-signed-url/${bucketId}/${key}?expires=${expiresInSeconds}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getProviderQuota(_connectionId: string): Promise<{
    usedBytes: number;
    totalBytes: number;
  }> {
    return { usedBytes: 0, totalBytes: 1024 * 1024 * 1024 * 15 }; // 15GB mock
  }
}

export class ProviderRegistry {
  private providers = new Map<string, StorageProvider>();

  register(name: string, provider: StorageProvider) {
    this.providers.set(name, provider);
  }

  get(name: string): StorageProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const registry = new ProviderRegistry();
registry.register("in_memory", new InMemoryProvider());
// google_drive is registered dynamically per-connection via:
//   import { GoogleDriveProvider } from "@/lib/storage/google-drive/provider";
//   const provider = new GoogleDriveProvider(connectionId);
