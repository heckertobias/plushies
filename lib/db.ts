import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH ?? "./plushies.db";

// Singleton to survive Next.js dev-mode hot reloads
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle<typeof schema>> | undefined };

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return db;
}

export const db = globalForDb.db ?? (globalForDb.db = createDb());
