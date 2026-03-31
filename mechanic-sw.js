const CACHE_NAME = "handiman-mechanic-v2";
const OFFLINE_URL = "/pwa/offline-mechanic.html";

const ASSETS = [
  "/mechanic/mechanicDashboard.html",
  "/mechanic/mechanicDashboard.css",
  "/mechanic/mechanicDashboard.js",
  "/mechanic/mechanicJobs.js",
  "/js/firebase.js",
  "/assets/splash_logo.png",
  "/pwa/mechanic.webmanifest",
  OFFLINE_URL,
  "/icons/mechanic-icon-192.png",
  "/icons/mechanic-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("handiman-mechanic-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  event.respondWith(cacheFirstAsset(event.request));
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return cache.match(OFFLINE_URL);
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
