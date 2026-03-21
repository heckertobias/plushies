import { defineConfig } from "drizzle-kit";
import { join } from "node:path";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? `file:${join(process.cwd(), "plushies.db")}`,
  },
});
