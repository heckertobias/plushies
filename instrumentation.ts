/** Global guard so the scheduler isn't registered twice during Next.js dev hot-reloads. */
const globalForScheduler = globalThis as unknown as { badgeSchedulerStarted?: boolean };

const BADGE_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

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
