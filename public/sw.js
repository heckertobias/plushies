// Service Worker for Plüschie-Kalender
// Handles Web Push and Badge API

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const count = typeof payload.count === "number" ? payload.count : 0;
  const body = payload.body ?? (count === 1
    ? "🎂 1 Plüschie hat heute Geburtstag!"
    : `🎂 ${count} Plüschies haben heute Geburtstag!`);

  // Update app badge
  if (count > 0) {
    self.navigator.setAppBadge?.(count).catch(() => {});
  } else {
    self.navigator.clearAppBadge?.().catch(() => {});
  }

  // iOS requires a visible notification for every push, otherwise it revokes the subscription.
  const notificationPromise = self.registration.showNotification("Plüschie-Kalender", {
    body,
    icon: "/apple-icon",
    badge: "/apple-icon",
    tag: "birthday-badge",
    renotify: false,
    data: { url: "/" },
  });

  event.waitUntil(notificationPromise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
