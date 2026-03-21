import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH ?? "./plushies.db";
const MIGRATIONS_DIR = join(import.meta.dir, "../../drizzle");

const sqlite = new Database(DB_PATH, { create: true });
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: MIGRATIONS_DIR });
console.log("Database migrations applied");
