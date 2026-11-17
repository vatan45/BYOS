import nextEnv from "@next/env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local before migrating.");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
} finally {
  await sql.end();
}
