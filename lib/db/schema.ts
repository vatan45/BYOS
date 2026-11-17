import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), // Application-owned account ID
  email: text("email").notNull().unique(),
  plan: text("plan").notNull().default("free"), // 'free' or 'pro'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 2. storage_connections
export const storageConnections = pgTable("storage_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g. "google_drive"
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  providerAccountEmail: text("provider_account_email").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'revoked', 'error'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index("idx_connections_user_id").on(t.userId),
}));

// 3. buckets
export const buckets = pgTable("buckets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => storageConnections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  providerFolderId: text("provider_folder_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unqNameUser: unique("unq_buckets_name_user").on(t.userId, t.name),
  userIdIdx: index("idx_buckets_user_id").on(t.userId),
  connectionIdIdx: index("idx_buckets_connection_id").on(t.connectionId),
}));

// 4. objects
export const objects = pgTable("objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  providerFileId: text("provider_file_id").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  contentType: text("content_type").notNull(),
  etag: text("etag").notNull(),
  currentVersionId: uuid("current_version_id"), // FK added later to avoid circular dependency
  syncStatus: text("sync_status").notNull().default("synced"), // 'synced', 'missing_in_provider', 'discovered'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unqBucketKey: unique("unq_objects_bucket_key").on(t.bucketId, t.key),
  bucketIdKeyIdx: index("idx_objects_bucket_key").on(t.bucketId, t.key),
  bucketIdIdx: index("idx_objects_bucket_id").on(t.bucketId),
}));

// 5. object_versions
export const objectVersions = pgTable("object_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectId: uuid("object_id")
    .notNull()
    .references(() => objects.id, { onDelete: "cascade" }),
  providerFileId: text("provider_file_id").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  etag: text("etag").notNull(),
  versionNumber: integer("version_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  objectIdIdx: index("idx_obj_versions_object_id").on(t.objectId),
}));

// 6. api_keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  name: text("name").notNull(),
  scopes: jsonb("scopes").notNull().$type<string[]>(), // e.g. ["read", "write", "delete", "list"]
  bucketRestriction: uuid("bucket_restriction")
    .references(() => buckets.id, { onDelete: "cascade" }),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (t) => ({
  keyPrefixIdx: index("idx_api_keys_prefix").on(t.keyPrefix),
  keyHashIdx: index("idx_api_keys_hash").on(t.keyHash),
  userIdIdx: index("idx_api_keys_user_id").on(t.userId),
}));

// 7. usage_logs
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bucketId: uuid("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  apiKeyId: uuid("api_key_id")
    .references(() => apiKeys.id, { onDelete: "set null" }),
  operation: text("operation").notNull(), // 'upload', 'download', 'delete', 'list'
  objectKey: text("object_key"), // Optional filename/path for object-level analytics
  bytesTransferred: integer("bytes_transferred").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userCreatedIdx: index("idx_usage_logs_user_created").on(t.userId, t.createdAt),
  userIdIdx: index("idx_usage_logs_user_id").on(t.userId),
  bucketIdIdx: index("idx_usage_logs_bucket_id").on(t.bucketId),
}));

// 8. signed_url_grants
export const signedUrlGrants = pgTable("signed_url_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectId: uuid("object_id")
    .references(() => objects.id, { onDelete: "cascade" }),
  bucketId: uuid("bucket_id")
    .references(() => buckets.id, { onDelete: "cascade" }),
  key: text("key"),
  operation: text("operation").notNull().default("get"), // 'get' | 'put'
  signature: text("signature"),
  maxSizeBytes: integer("max_size_bytes"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revoked: boolean("revoked").notNull().default(false),
}, (t) => ({
  objectIdIdx: index("idx_signed_urls_object_id").on(t.objectId),
  signatureIdx: index("idx_signed_urls_signature").on(t.signature),
}));

// 9. folder_path_cache — maps S3-style key prefixes to Drive folder IDs
export const folderPathCache = pgTable("folder_path_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  bucketId: uuid("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  path: text("path").notNull(), // e.g. "images/avatars"
  providerFolderId: text("provider_folder_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unqBucketPath: unique("unq_folder_cache_bucket_path").on(t.bucketId, t.path),
  bucketIdIdx: index("idx_folder_cache_bucket_id").on(t.bucketId),
}));

// 10. usage_daily_rollups — hourly aggregated usage stats per user/bucket/date
export const usageDailyRollups = pgTable("usage_daily_rollups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bucketId: uuid("bucket_id")
    .references(() => buckets.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // format YYYY-MM-DD
  uploadCount: integer("upload_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  deleteCount: integer("delete_count").notNull().default(0),
  listCount: integer("list_count").notNull().default(0),
  bytesUploaded: integer("bytes_uploaded").notNull().default(0),
  bytesDownloaded: integer("bytes_downloaded").notNull().default(0),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unqUserBucketDate: unique("unq_rollups_user_bucket_date").on(t.userId, t.bucketId, t.date),
  userIdDateIdx: index("idx_rollups_user_date").on(t.userId, t.date),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  connections: many(storageConnections),
  buckets: many(buckets),
  apiKeys: many(apiKeys),
  usageLogs: many(usageLogs),
  usageDailyRollups: many(usageDailyRollups),
}));

export const storageConnectionsRelations = relations(storageConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [storageConnections.userId],
    references: [users.id],
  }),
  buckets: many(buckets),
}));

export const bucketsRelations = relations(buckets, ({ one, many }) => ({
  user: one(users, {
    fields: [buckets.userId],
    references: [users.id],
  }),
  connection: one(storageConnections, {
    fields: [buckets.connectionId],
    references: [storageConnections.id],
  }),
  objects: many(objects),
  usageLogs: many(usageLogs),
  folderCache: many(folderPathCache),
}));

export const objectsRelations = relations(objects, ({ one, many }) => ({
  bucket: one(buckets, {
    fields: [objects.bucketId],
    references: [buckets.id],
  }),
  versions: many(objectVersions),
  signedUrls: many(signedUrlGrants),
}));

export const objectVersionsRelations = relations(objectVersions, ({ one }) => ({
  object: one(objects, {
    fields: [objectVersions.objectId],
    references: [objects.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  bucketRestriction: one(buckets, {
    fields: [apiKeys.bucketRestriction],
    references: [buckets.id],
  }),
  usageLogs: many(usageLogs),
}));

export const folderPathCacheRelations = relations(folderPathCache, ({ one }) => ({
  bucket: one(buckets, {
    fields: [folderPathCache.bucketId],
    references: [buckets.id],
  }),
}));

export const passwordCredentials = pgTable("password_credentials", {
 userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
 passwordHash: text("password_hash").notNull(),
});
export const authSessions = pgTable("auth_sessions", {
 tokenHash: text("token_hash").primaryKey(),
 userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
 expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => ({ userIdx: index("auth_sessions_user_idx").on(t.userId) }));
export const authAttempts = pgTable("auth_attempts", {
 key: text("key").primaryKey(), count: integer("count").notNull(),
 expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
