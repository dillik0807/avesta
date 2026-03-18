// Service Worker для Avesta 2026 PWA
const CACHE_NAME = 'avesta-v20260318';

// При установке — кешируем только статику
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/js/api.js',
        '/js/adapter.js',
        '/js/main.js',
        '/js/management.js'
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Сеть в приоритете, кеш как запасной вариант
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Пропускаем API запросы и запросы к сторонним доменам
  if (url.includes('/api/') || !url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
