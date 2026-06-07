/** Global guard so the scheduler isn't registered twice during Next.js dev hot-reloads. */
const globalForScheduler = globalThis as unknown as { badgeSchedulerStarted?: boolean };

function msUntilNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

async function startBadgeScheduler() {
  if (globalForScheduler.badgeSchedulerStarted) return;
  globalForScheduler.badgeSchedulerStarted = true;

  const { sendBadgePushToAll } = await import("./lib/push");

  async function tick() {
    try {
      await sendBadgePushToAll();
    } catch (err) {
      console.error("[badge-scheduler] tick failed:", err);
    }
    // Schedule next tick in 24 h
    setTimeout(tick, 24 * 60 * 60 * 1000);
  }

  const delay = msUntilNextMidnight();
  console.log(
    `[badge-scheduler] first tick in ${Math.round(delay / 1000 / 60)} min (next midnight)`,
  );
  setTimeout(tick, delay);
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { db } = await import("./lib/db");
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    const { join } = await import("node:path");
    await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });

    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
      await startBadgeScheduler();
    }
  }
}
