import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { join } from "node:path";
import * as schema from "./schema";

const DB_URL = process.env.DATABASE_URL ?? `file:${join(process.cwd(), "plushies.db")}`;

// Singleton to survive Next.js dev-mode hot reloads
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle<typeof schema>> | undefined };

function createDb() {
  const client = createClient({ url: DB_URL });
  return drizzle(client, { schema });
}

export const db = globalForDb.db ?? (globalForDb.db = createDb());
