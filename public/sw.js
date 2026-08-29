// sw.js — Service worker toi gian: chi de trinh duyet coi day la mot PWA "cai duoc"
// (dieu kien bat buoc de co nut "Tai ung dung" that su tren Chrome/Edge/Android).
// Cache "app shell" co ban de mo lai nhanh hon o lan sau; du lieu API (ban do,
// tim duong...) luon lay moi tu mang, khong cache, vi day la thong tin thoi gian thuc.

const CACHE_NAME = "mapviet-shell-v1";
const APP_SHELL = [
  "/login.html",
  "/index.html",
  "/css/style.css",
  "/js/api.js",
  "/js/bg-canvas.js",
  "/js/app.js",
  "/js/map.js",
  "/js/admin.js",
  "/js/login.js",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Khong bao gio cache goi API - luon can du lieu moi nhat (vi tri, ban do, thoi tiet...)
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResp) => {
          if (networkResp && networkResp.ok && url.origin === self.location.origin) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
