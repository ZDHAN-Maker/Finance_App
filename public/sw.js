// Service worker minimal: cache app-shell agar bisa dibuka lagi saat
// offline/koneksi lambat. Sengaja tidak memakai library (Workbox, dsb)
// supaya mudah dibaca dan di-debug — sesuai prinsip "simple first".

const CACHE_NAME = "kas-shell-v2";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Jangan cache API call — data keuangan harus selalu segar.
  if (request.url.includes("/api/")) return;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached;
        }
      }

      if (cached) return cached;

      try {
        const response = await fetch(request);
        const contentType = response.headers.get("content-type") || "";
        const isScript = request.destination === "script";
        const isStyle = request.destination === "style";
        const hasExpectedType =
          (!isScript || /javascript|ecmascript|wasm/i.test(contentType)) &&
          (!isStyle || /text\/css/i.test(contentType));

        if (response.ok && hasExpectedType) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })
  );
});


// ---------------------------------------------------------------------------
// Push & Notification Handling
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "D'Cash - Notifikasi Batasan Keuangan";
    const options = {
      body: data.body || "Cek batas pengeluaran dan jatah jajan kamu hari ini.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/dashboard" },
      vibrate: [100, 50, 100],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("D'Cash", {
        body: text,
        icon: "/icons/icon-192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
