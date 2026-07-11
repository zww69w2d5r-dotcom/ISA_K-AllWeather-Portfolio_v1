/* K-올웨더 ISA — 서비스워커: 앱 껍데기 캐시(오프라인 열람용).
   데이터는 API로 받아 localStorage에 캐시하므로 여기서는 정적 자원과
   Chart.js CDN만 다루고, script.google.com API 요청은 건드리지 않는다. */
const CACHE = 'isa-shell-v1';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Chart.js 등 CDN: 캐시 우선 (오프라인에서도 차트 동작)
  if (url.host === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return r;
      }))
    );
    return;
  }
  if (url.origin !== location.origin) return;   // API 요청은 통과

  // 앱 껍데기: 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp));
      return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
