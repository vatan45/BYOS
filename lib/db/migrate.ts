import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const migrationClient = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(migrationClient);

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations complete!");
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();
