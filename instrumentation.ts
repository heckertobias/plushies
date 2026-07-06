/** Global guards so the scheduler / console patch aren't applied twice during dev hot-reloads. */
const globalForScheduler = globalThis as unknown as {
  badgeSchedulerStarted?: boolean;
  consoleTimestampPatched?: boolean;
};

const BADGE_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Prefixes every server-side console line with an ISO timestamp so the docker logs show when
 * things happen. Wraps the console methods once so it also covers Next.js-internal output (e.g.
 * the "Failed to find Server Action" errors, which go through console.error).
 */
function patchConsoleWithTimestamps() {
  if (globalForScheduler.consoleTimestampPatched) return;
  globalForScheduler.consoleTimestampPatched = true;

  const methods = ["log", "info", "warn", "error", "debug"] as const;
  for (const method of methods) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => original(`[${new Date().toISOString()}]`, ...args);
  }
}

async function startBadgeScheduler() {
  if (globalForScheduler.badgeSchedulerStarted) return;
  globalForScheduler.badgeSchedulerStarted = true;

  const { runDailyBadgeCheck } = await import("./lib/push");

  async function tick() {
    try {
      await runDailyBadgeCheck();
    } catch (err) {
      console.error("[badge-scheduler] tick failed:", err);
    }
  }

  // Run immediately (catches up a missed day after a redeploy/restart), then every minute.
  // runDailyBadgeCheck() is idempotent per calendar day, so frequent ticks are cheap.
  console.log(`[badge-scheduler] starting, checking every ${BADGE_CHECK_INTERVAL_MS / 1000}s`);
  void tick();
  setInterval(tick, BADGE_CHECK_INTERVAL_MS);
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    patchConsoleWithTimestamps();

    const { db } = await import("./lib/db");
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    const { join } = await import("node:path");
    await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });

    const { isVapidConfigured } = await import("./lib/push");
    if (isVapidConfigured()) {
      await startBadgeScheduler();
    }
  }
}
