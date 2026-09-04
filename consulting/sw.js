// Clouddroid FinOps Consulting — Service Worker
// Cache name includes the build-id so every deploy automatically
// invalidates the old cache. Reads build-info.json on activation.

const PRECACHE_PATHS = [
  '/',
  '/about.html',
  '/faq.html',
  '/contact.html',
  '/terms.html',
  '/privacy.html',
  '/refund.html',
  '/subprocessors.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/main.js',
  '/js/disclaimer.js',
  '/js/cache-bust.js',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('cd-consulting-runtime').then((cache) =>
      cache.addAll(PRECACHE_PATHS).catch(() => null)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Bust ALL old caches regardless of name (every deploy creates a new one)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== 'cd-consulting-runtime')
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache API endpoints
  if (url.pathname.startsWith('/api/')) return;
  // Never cache versioned assets (?v=...)
  // (browsers already handle those correctly)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open('cd-consulting-runtime').then((c) => c.put(request, copy)).catch(() => null);
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open('cd-consulting-runtime').then((c) => c.put(request, copy)).catch(() => null);
      return res;
    }))
  );
});
