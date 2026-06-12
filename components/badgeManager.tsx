"use client";

import { useEffect, useState } from "react";
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

export default function BadgeManager({ todayCount, vapidPublicKey }: Props) {
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<BadgeStatus | null>(null);

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

  // Once notifications are allowed, fetch a diagnostic snapshot for the test-push UI
  useEffect(() => {
    if (permissionState !== "granted" || !vapidPublicKey) return;

    fetch("/api/push/status")
      .then((res) => res.json())
      .then((data: BadgeStatus) => setStatus(data))
      .catch(() => {});
  }, [permissionState, vapidPublicKey]);

  async function handleEnableBadge() {
    if (!("Notification" in window) || !("PushManager" in window) || !vapidPublicKey) return;

    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });

      // Set badge immediately after subscribing
      if (todayCount > 0) {
        navigator.setAppBadge?.(todayCount).catch(() => {});
      }
    } catch (err) {
      console.error("[BadgeManager] subscribe failed", err);
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

  // Only show the bell when Notifications are supported and the user hasn't decided yet
  const showEnableButton = supportsPush && permissionState === "default";

  // Once enabled, show a small test-push button so the delivery pipeline can be verified on-device
  const showTestButton = supportsPush && permissionState === "granted";

  if (!showEnableButton && !showTestButton) return null;

  if (showEnableButton) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEnableBadge}
        disabled={isSubscribing}
        aria-label="Geburtstags-Benachrichtigungen aktivieren"
        title="Geburtstags-Benachrichtigungen aktivieren"
        className="text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  const statusText = status
    ? `${status.vapidConfigured ? "VAPID ok" : "VAPID fehlt"} · ${status.subscriptionCount} Abo${status.subscriptionCount === 1 ? "" : "s"} · zuletzt gesendet: ${status.lastSentDate ?? "nie"}`
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
