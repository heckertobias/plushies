import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { join } from "node:path";
import * as schema from "./schema";

const DB_URL = process.env.DATABASE_URL ?? `file:${join(process.cwd(), "plushies.db")}`;

// Singleton to survive Next.js dev-mode hot reloads
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle<typeof schema>> | undefined };

function createDb() {
  const client = createClient({ url: DB_URL });
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return db;
}

export const db = globalForDb.db ?? (globalForDb.db = createDb());
