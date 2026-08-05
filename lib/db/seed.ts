import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// Load environment variables for the standalone script
dotenv.config();

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://user:password@localhost:5432/byos";

const queryClient = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(queryClient, { schema });

async function main() {
  console.log("Seeding database...");

  try {
    // 1. Insert a test user
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "test@example.com",
        plan: "free",
      })
      .returning();

    console.log("Created user:", user.id);

    // 2. Insert a fake connection
    const [connection] = await db
      .insert(schema.storageConnections)
      .values({
        userId: user.id,
        provider: "google_drive",
        accessTokenEncrypted: "fake-access-token",
        refreshTokenEncrypted: "fake-refresh-token",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000), // +1 hour
        providerAccountEmail: "drive@example.com",
        status: "active",
      })
      .returning();

    console.log("Created connection:", connection.id);

    // 3. Insert a bucket
    const [bucket] = await db
      .insert(schema.buckets)
      .values({
        userId: user.id,
        connectionId: connection.id,
        name: "test-bucket",
        providerFolderId: "fake-folder-id",
      })
      .returning();

    console.log("Created bucket:", bucket.id);

    // 4. Insert 3 dummy objects
    const objectsToInsert = [
      {
        bucketId: bucket.id,
        key: "documents/report.pdf",
        providerFileId: "fake-file-1",
        sizeBytes: 1024 * 1024 * 5, // 5MB
        contentType: "application/pdf",
        etag: "etag-1",
      },
      {
        bucketId: bucket.id,
        key: "images/logo.png",
        providerFileId: "fake-file-2",
        sizeBytes: 1024 * 500, // 500KB
        contentType: "image/png",
        etag: "etag-2",
      },
      {
        bucketId: bucket.id,
        key: "data/backup.zip",
        providerFileId: "fake-file-3",
        sizeBytes: 1024 * 1024 * 100, // 100MB
        contentType: "application/zip",
        etag: "etag-3",
      },
    ];

    const insertedObjects = await db
      .insert(schema.objects)
      .values(objectsToInsert)
      .returning();

    console.log(
      "Created objects:",
      insertedObjects.map((o) => o.key)
    );

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await queryClient.end();
  }
}

main();
