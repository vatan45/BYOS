import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

// Ensure a singleton database connection pool across Next.js dev HMR and Serverless invocations.
// Without caching on globalThis, Hot Module Replacement in development or parallel API workers
// will repeatedly spawn postgres instances until Supabase's max connection pool (15) is exhausted.

type DrizzleClient = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  queryClient: postgres.Sql | undefined;
  drizzleDb: DrizzleClient | undefined;
};

const queryClient =
  globalForDb.queryClient ??
  postgres(env.DATABASE_URL, {
    max: 1, // Keep max 1 concurrent connection per worker/dev instance
    idle_timeout: 20, // Close idle connections after 20 seconds to release pool slots
    connect_timeout: 10,
    prepare: false, // Prevent prepared statement conflicts with Supavisor / transaction poolers
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db =
  globalForDb.drizzleDb ??
  drizzle(queryClient, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.drizzleDb = db;
}
