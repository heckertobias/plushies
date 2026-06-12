import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions, plushies, appState } from "@/lib/schema";
import { countTodaysBirthdays, nextBirthdayMessage } from "@/lib/groupPlushies";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import packageJson from "@/package.json";

/** app_state key storing the date (YYYY-MM-DD, server-local) the daily badge push last went out. */
const BADGE_LAST_SENT_KEY = "badge_last_sent_date";

export function isVapidConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function ensureVapid() {
  if (!isVapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

async function getAppState(key: string): Promise<string | null> {
  const rows = await db.select().from(appState).where(eq(appState.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function setAppState(key: string, value: string): Promise<void> {
  await db.insert(appState).values({ key, value }).onConflictDoUpdate({ target: appState.key, set: { value } });
}

export type SendBadgePushResult = {
  vapidConfigured: boolean;
  /** Today's birthday count (0 if none – a "next birthday" hint is sent instead). */
  count: number;
  subscriptionCount: number;
  sent: number;
  removed: number;
};

/**
 * Sends the daily badge push to all subscribers: the birthday count (and updates the app
 * badge) on days with birthdays, or a friendly "next birthday" hint that clears the badge
 * on days without. Always sends exactly one push per call – callers control frequency.
 */
export async function sendBadgePushToAll(): Promise<SendBadgePushResult> {
  if (!ensureVapid()) {
    console.warn("[push] VAPID not configured – skipping badge push");
    return { vapidConfigured: false, count: 0, subscriptionCount: 0, sent: 0, removed: 0 };
  }

  const all = await db.select().from(plushies);
  const today = dayjs();
  const count = countTodaysBirthdays(all, today);

  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) {
    console.log("[push] no subscriptions – skipping badge push");
    return { vapidConfigured: true, count, subscriptionCount: 0, sent: 0, removed: 0 };
  }

  const body =
    count === 1
      ? "🎂 1 Plüschie hat heute Geburtstag!"
      : count > 1
        ? `🎂 ${count} Plüschies haben heute Geburtstag!`
        : nextBirthdayMessage(all, today);

  const payload = JSON.stringify({ count, body });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired or unregistered → remove
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
          removed++;
        } else {
          console.error("[push] sendNotification failed:", err);
        }
      }
    }),
  );

  console.log(
    `[push] badge push done: count=${count}, subscriptions=${subs.length}, sent=${sent}, removed=${removed}`,
  );

  return { vapidConfigured: true, count, subscriptionCount: subs.length, sent, removed };
}

/**
 * Idempotent daily check: sends the badge push at most once per calendar day (server-local
 * date). Meant to be called frequently (e.g. every minute) so a missed day – e.g. due to a
 * redeploy around midnight – is caught up on the next tick instead of being skipped entirely.
 */
export async function runDailyBadgeCheck(): Promise<void> {
  const today = dayjs().format("YYYY-MM-DD");
  const lastSent = await getAppState(BADGE_LAST_SENT_KEY);
  if (lastSent === today) return;

  try {
    const result = await sendBadgePushToAll();
    if (result.vapidConfigured) {
      await setAppState(BADGE_LAST_SENT_KEY, today);
    }
  } catch (err) {
    console.error("[push] daily badge check failed:", err);
  }
}

export type BadgeStatus = {
  vapidConfigured: boolean;
  subscriptionCount: number;
  todayCount: number;
  lastSentDate: string | null;
  /** App version (from package.json) – lets the in-app status confirm which build is running. */
  version: string;
};

/** Diagnostic snapshot for the in-app status check. */
export async function getBadgeStatus(): Promise<BadgeStatus> {
  const [subs, all, lastSentDate] = await Promise.all([
    db.select().from(pushSubscriptions),
    db.select().from(plushies),
    getAppState(BADGE_LAST_SENT_KEY),
  ]);

  return {
    vapidConfigured: isVapidConfigured(),
    subscriptionCount: subs.length,
    todayCount: countTodaysBirthdays(all, dayjs()),
    lastSentDate,
    version: packageJson.version,
  };
}
