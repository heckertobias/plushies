"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  vapidPublicKey: string;
};

/** localStorage key remembering that the user dismissed the activation prompt ("Später"). */
const PUSH_PROMPT_DISMISSED_KEY = "pushPromptDismissed";

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
 * Returns whether THIS device currently holds a subscription.
 */
async function healExistingSubscription(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return false;

  try {
    const res = await postSubscription(subscription);
    if (!res.ok) console.error("[BadgeManager] subscription heal failed", res.status);
  } catch (err) {
    console.error("[BadgeManager] subscription heal failed", err);
  }
  return true;
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
    toast.error(`Abonnieren fehlgeschlagen: ${detail}`);
  }

  return permission;
}

export default function BadgeManager({ vapidPublicKey }: Props) {
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  // Whether THIS device holds a push subscription (server count is global across devices,
  // so it can't tell a new device that it still needs to subscribe).
  const [hasLocalSubscription, setHasLocalSubscription] = useState<boolean | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  // The activation prompt should appear at most once per app start.
  const promptShownRef = useRef(false);

  // Register service worker on mount
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

  // The badge is set by the birthday push (sw.js); opening the app means it was seen,
  // so clear it – no daily "clear" push needed on days without birthdays.
  useEffect(() => {
    if (!("clearAppBadge" in navigator)) return;
    navigator.clearAppBadge().catch(() => {});
  }, []);

  // Track notification permission state
  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermissionState(Notification.permission);
  }, []);

  // Once the permission state is known: heal a subscription that's lost server-side (without
  // a new permission prompt), and – if this device isn't subscribed and the user hasn't
  // dismissed it before – proactively offer activation via a toast. The toast's button tap
  // is the user gesture iOS requires for pushManager.subscribe() (see ensureSubscribed).
  useEffect(() => {
    if (permissionState === null || permissionState === "denied" || !vapidPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;

    (async () => {
      let hasSub = false;
      if (permissionState === "granted") {
        hasSub = await healExistingSubscription();
      }
      if (cancelled) return;
      setHasLocalSubscription(hasSub);

      if (hasSub || promptShownRef.current) return;
      try {
        if (localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)) return;
      } catch {
        return;
      }
      promptShownRef.current = true;

      toast("🔔 Geburtstags-Erinnerungen aktivieren?", {
        duration: Infinity,
        action: {
          label: "Aktivieren",
          onClick: () => {
            void handleEnableBadge();
          },
        },
        cancel: {
          label: "Später",
          onClick: () => {
            try {
              localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "1");
            } catch {
              // private mode etc. – prompt will simply reappear next start
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionState, vapidPublicKey]);

  async function handleEnableBadge() {
    if (!("Notification" in window) || !("PushManager" in window) || !vapidPublicKey) return;

    setIsSubscribing(true);
    try {
      const permission = await ensureSubscribed(vapidPublicKey, registrationRef.current);
      setPermissionState(permission);

      if (permission === "granted") {
        try {
          const sub = await registrationRef.current?.pushManager.getSubscription();
          setHasLocalSubscription(!!sub);
        } catch {
          // leave as-is; the bell stays visible for another attempt
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  }

  const supportsPush =
    !!vapidPublicKey &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window;

  // Manual fallback (e.g. after dismissing the prompt with "Später"): show the bell as long
  // as this device has no subscription – either permission hasn't been decided yet, or it's
  // granted but no subscription exists. Tapping it runs the subscribe flow inside a user
  // gesture, which iOS requires. Once subscribed, the component renders nothing.
  const needsSubscription = permissionState === "granted" && hasLocalSubscription === false;
  const showEnableButton = supportsPush && (permissionState === "default" || needsSubscription);

  if (!showEnableButton) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleEnableBadge}
      disabled={isSubscribing}
      aria-label="Geburtstags-Benachrichtigungen aktivieren"
      title={
        needsSubscription
          ? "Benachrichtigungen erneut aktivieren (Abo fehlt auf diesem Gerät)"
          : "Geburtstags-Benachrichtigungen aktivieren"
      }
      className="text-muted-foreground hover:text-foreground"
    >
      <Bell className="h-4 w-4" />
    </Button>
  );
}
