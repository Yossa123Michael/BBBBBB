self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Meloloskan seluruh request API langsung ke backend
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});