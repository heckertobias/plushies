import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { plushies } from "@/lib/schema";
import { countTodaysBirthdays } from "@/lib/groupPlushies";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";

function isVapidConfigured() {
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

export async function sendBadgePushToAll({ force = false }: { force?: boolean } = {}) {
  if (!ensureVapid()) {
    console.warn("[push] VAPID not configured – skipping badge push");
    return;
  }

  const all = await db.select().from(plushies);
  const count = countTodaysBirthdays(all, dayjs());

  // No push on days with no birthdays → avoids annoying "0" notifications
  // (force=true bypasses this for the test endpoint)
  if (count === 0 && !force) return;

  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) return;

  const body = count === 1
    ? "🎂 1 Plüschie hat heute Geburtstag!"
    : `🎂 ${count} Plüschies haben heute Geburtstag!`;

  const payload = JSON.stringify({ count, body });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired or unregistered → remove
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        } else {
          console.error("[push] sendNotification failed:", err);
        }
      }
    }),
  );
}
