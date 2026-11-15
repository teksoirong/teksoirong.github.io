/* Teksoi Rong – small service worker.
   • The website itself: network first, so a new index.html shows up at once; the last copy is kept for offline use.
   • Same-site images/icons: served from the cache first and refreshed in the background.
   • Everything on other sites (Firebase login/database, fonts, maps) is never touched – it always goes to the network. */
const CACHE = 'teksoi-rong-v1', SHELL = './__shell';
self.addEventListener('install', e => {
  self.skipWaiting();
  // keep a first copy of the site (taken from the browser's own cache when possible) so it also opens offline the very first time
  e.waitUntil(
    fetch('./', { cache: 'force-cache' }).then(res => res.status === 200 ? caches.open(CACHE).then(k => k.put(SHELL, res)) : null).catch(() => {})
  );
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        if (res.status === 200) { const c = res.clone(); caches.open(CACHE).then(k => k.put(SHELL, c)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(SHELL).then(hit => hit || Response.error()))
    );
    return;
  }
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r).then(res => {
        if (res.status === 200) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)).catch(() => {}); }
        return res;
      }).catch(() => hit || Response.error());
      return hit || net;
    })
  );
});
