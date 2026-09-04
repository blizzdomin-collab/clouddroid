// Clouddroid FinOps Consulting — Service Worker
// Caches legal and FAQ pages for offline read access (B2B reference material).

const CACHE_NAME = 'cd-consulting-v1';
const CACHE_PATHS = [
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
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_PATHS)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache API or checkout
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/api/consulting/')) return;
  // Network-first for HTML, cache-first for assets
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => null);
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => null);
      return res;
    }))
  );
});
