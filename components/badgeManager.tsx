"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  todayCount: number;
  vapidPublicKey: string;
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

  // Only show the button when VAPID is configured, Notifications are supported,
  // and the user hasn't granted or denied permission yet
  const showButton =
    !!vapidPublicKey &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    permissionState === "default";

  if (!showButton) return null;

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
