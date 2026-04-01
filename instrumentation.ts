export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("./lib/db");
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    const { join } = await import("node:path");
    await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  }
}
