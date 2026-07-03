const CACHE_NAME = 'coindrop-v3';
const PRECACHE = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/privacy',
  '/css/style.css',
  '/css/dashboard.css',
  '/css/landing.css',
  '/css/verify.css',
  '/assets/logo.png',
  '/assets/playstore/icon_192.png',
  '/assets/playstore/icon_512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('coindrop-auth.up.railway.app') ||
      e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('api.coingecko.com')) {
    return;
  }
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
