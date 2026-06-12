"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  todayCount: number;
  vapidPublicKey: string;
};

type BadgeStatus = {
  vapidConfigured: boolean;
  subscriptionCount: number;
  todayCount: number;
  lastSentDate: string | null;
  version: string;
};

type TestPushResult = {
  vapidConfigured: boolean;
  count: number;
  subscriptionCount: number;
  sent: number;
  removed: number;
};

/** Converts a URL-safe base64 string to Uint8Array (required for VAPID applicationServerKey). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Posts a subscription to the server (upsert). Returns the raw response so callers can
 * surface the HTTP status on failure.
 */
async function postSubscription(subscription: PushSubscription): Promise<Response> {
  const json = subscription.toJSON();
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    }),
  });
}

/**
 * Gesture-free heal: if the browser already holds a push subscription (granted earlier,
 * possibly lost server-side), re-upsert it. Does NOT call subscribe() – on iOS that
 * requires an active user gesture, so this only ever reuses an existing subscription.
 */
async function healExistingSubscription(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;

  try {
    const res = await postSubscription(subscription);
    if (!res.ok) console.error("[BadgeManager] subscription heal failed", res.status);
  } catch (err) {
    console.error("[BadgeManager] subscription heal failed", err);
  }
}

/**
 * Rejects with a descriptive error if `promise` doesn't settle within `ms`. iOS's
 * pushManager.subscribe() (or serviceWorker.ready) can hang forever instead of
 * resolving/rejecting – without this, that leaves the tap handler's `finally` (which
 * re-enables the button) never running, so the icon stays permanently disabled.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Zeitüberschreitung bei ${label} (${ms / 1000}s)`)), ms),
    ),
  ]);
}

/**
 * Requests notification permission (if needed) and creates/registers a push subscription –
 * must run synchronously within a user gesture (tap), as iOS requires that for
 * pushManager.subscribe(). Shows a toast with the outcome, including which step failed.
 *
 * `registration` is an optionally pre-fetched `serviceWorker.ready` result: every `await`
 * before `pushManager.subscribe()` risks losing iOS's user-gesture token, so the caller
 * fetches it ahead of time (outside the gesture) when possible.
 */
async function ensureSubscribed(
  vapidPublicKey: string,
  registration: ServiceWorkerRegistration | null,
): Promise<NotificationPermission> {
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    if (permission === "denied") {
      toast.error("Benachrichtigungen wurden blockiert. Bitte in den iOS-Einstellungen erlauben.");
    }
    return permission;
  }

  try {
    const reg = await withTimeout(
      registration ? Promise.resolve(registration) : navigator.serviceWorker.ready,
      3000,
      "serviceWorker.ready",
    );

    // subscribe() returns the existing subscription if one with the same
    // applicationServerKey already exists, so getSubscription() isn't needed here.
    const subscription = await withTimeout(
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }),
      8000,
      "pushManager.subscribe()",
    );

    const res = await postSubscription(subscription);
    if (!res.ok) {
      toast.error(`Benachrichtigungen aktiviert, aber Speichern fehlgeschlagen (${res.status}).`);
    } else {
      toast.success("Benachrichtigungen aktiviert ✓");
    }
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[BadgeManager] subscribe failed", err);

    // Dump the browser's service worker registry – if serviceWorker.ready hangs, this is
    // visible local state (no network involved) that explains why, without remote debugging.
    let diag: string | undefined;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      diag =
        `controller=${!!navigator.serviceWorker.controller}, regs=${regs.length}` +
        regs
          .map(
            (r) =>
              ` [scope=${r.scope} active=${r.active?.state ?? "-"} installing=${r.installing?.state ?? "-"} waiting=${r.waiting?.state ?? "-"}]`,
          )
          .join("");
    } catch (diagErr) {
      diag = `diag failed: ${diagErr instanceof Error ? diagErr.message : String(diagErr)}`;
    }

    toast.error(`Abonnieren fehlgeschlagen: ${detail}`, { description: diag, duration: 20000 });
  }

  return permission;
}

export default function BadgeManager({ todayCount, vapidPublicKey }: Props) {
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<BadgeStatus | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register service worker and sync badge on mount / whenever todayCount changes
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[BadgeManager] SW registered", reg.scope);
      })
      .catch((err) => {
        console.error("[BadgeManager] SW registration failed", err);
      });

    // Pre-fetch the ready registration so the tap handler can call pushManager.subscribe()
    // without an extra await – on iOS, awaiting serviceWorker.ready inside the gesture can
    // itself consume the user-gesture token before subscribe() runs.
    navigator.serviceWorker.ready
      .then((reg) => {
        registrationRef.current = reg;
      })
      .catch(() => {});
  }, []);

  // Update badge whenever todayCount changes (also runs on visibility restore via router.refresh)
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;

    if (todayCount > 0) {
      navigator.setAppBadge(todayCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [todayCount]);

  // Track notification permission state
  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermissionState(Notification.permission);
  }, []);

  // Once notifications are allowed: heal a subscription that's lost server-side (e.g. past
  // migration error) without a new permission prompt, then fetch a diagnostic snapshot for
  // the status display. Does NOT call pushManager.subscribe() – that needs a user gesture
  // (see ensureSubscribed, called from the bell tap).
  useEffect(() => {
    if (permissionState !== "granted" || !vapidPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    (async () => {
      await healExistingSubscription();

      try {
        const res = await fetch("/api/push/status");
        const data: BadgeStatus = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        // status display is best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissionState, vapidPublicKey]);

  async function handleEnableBadge() {
    if (!("Notification" in window) || !("PushManager" in window) || !vapidPublicKey) return;

    setIsSubscribing(true);
    try {
      const permission = await ensureSubscribed(vapidPublicKey, registrationRef.current);
      setPermissionState(permission);

      if (permission === "granted") {
        try {
          const res = await fetch("/api/push/status");
          const data: BadgeStatus = await res.json();
          setStatus(data);
        } catch {
          // status display is best-effort
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  }

  async function handleTestPush() {
    setIsTesting(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const result: TestPushResult = await res.json();

      if (!result.vapidConfigured) {
        toast.error("VAPID ist nicht konfiguriert – Push kann nicht gesendet werden.");
      } else if (result.subscriptionCount === 0) {
        toast.error("Keine Push-Abonnements vorhanden.");
      } else {
        toast.success(
          `Test-Push gesendet (${result.sent}/${result.subscriptionCount} Gerät${result.subscriptionCount === 1 ? "" : "e"}).`,
        );
      }

      setStatus((prev) =>
        prev ? { ...prev, vapidConfigured: result.vapidConfigured, subscriptionCount: result.subscriptionCount } : prev,
      );
    } catch (err) {
      console.error("[BadgeManager] test push failed", err);
      toast.error("Test-Push fehlgeschlagen.");
    } finally {
      setIsTesting(false);
    }
  }

  const supportsPush =
    !!vapidPublicKey &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window;

  // Show the bell to (re-)activate notifications: either permission hasn't been decided yet,
  // or it's granted but the server has confirmed there's no subscription for this device
  // (lost/never arrived) – tapping it re-runs the subscribe flow inside a user gesture, which
  // iOS requires.
  const needsSubscription = permissionState === "granted" && status?.subscriptionCount === 0;
  const showEnableButton = supportsPush && (permissionState === "default" || needsSubscription);

  // Once enabled, default to the test-push button so the icon never disappears just because
  // /api/push/status hasn't resolved yet (or failed) – tapping it hits /api/push/test directly.
  const showTestButton = supportsPush && permissionState === "granted" && !needsSubscription;

  if (!showEnableButton && !showTestButton) return null;

  if (showEnableButton) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEnableBadge}
        disabled={isSubscribing}
        aria-label="Geburtstags-Benachrichtigungen aktivieren"
        title={
          needsSubscription
            ? "Benachrichtigungen erneut aktivieren (Abo fehlt auf dem Server)"
            : "Geburtstags-Benachrichtigungen aktivieren"
        }
        className="text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  const statusText = status
    ? `v${status.version} · ${status.vapidConfigured ? "VAPID ok" : "VAPID fehlt"} · ${status.subscriptionCount} Abo${status.subscriptionCount === 1 ? "" : "s"} · zuletzt gesendet: ${status.lastSentDate ?? "nie"}`
    : "Status wird geladen…";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleTestPush}
      disabled={isTesting}
      aria-label="Test-Push senden"
      title={`Test-Push senden (${statusText})`}
      className="text-muted-foreground hover:text-foreground"
    >
      <Send className="h-4 w-4" />
    </Button>
  );
}
