const CACHE_NAME = 'figurinhas-brasileirao-2026-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

// Rede primeiro, cache como reserva: online o usuário sempre recebe a versão
// mais nova (o data.js já foi corrigido várias vezes e cache-first deixava
// quem instalou preso na versão antiga); offline cai pro cache. `no-cache`
// força revalidar com o servidor em vez de usar o cache HTTP do navegador
// (GitHub Pages serve com max-age de 10 min) — quando nada mudou é só um 304.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' }).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() =>
      caches.match(event.request, { ignoreSearch: true }).then((cached) =>
        cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined)
      )
    )
  );
});
