// ===== OFFLINE HELPER (service worker) =====
// Lets the game be installed as an app and played without internet.
//
// How it stays up to date: when you're online it always asks the website
// for the newest files first, and only uses its saved copies when the
// internet is off (or super slow). So you never need to change this file
// when you update the game. Online play and the leaderboard still need
// internet; solo games work offline.

const CACHE = 'snake-offline';

// Files from other websites the game needs (Phaser and Firebase).
const OTHER_SITES = ['https://cdn.jsdelivr.net/npm/phaser@', 'https://www.gstatic.com/firebasejs/'];

const EXTRAS = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];

function shouldSave(url) {
  return url.startsWith(self.location.origin + '/') || OTHER_SITES.some(start => url.startsWith(start));
}

// On install, save the game page and every script it loads, so the very
// first offline visit works. The script list is read from index.html, so
// bumping ?v= numbers there is all it takes.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = await fetch('./', { cache: 'no-cache' });
    if (!page.ok) return;
    const html = await page.clone().text();
    await cache.put('./', page);
    const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m => new URL(m[1], self.location.href).href);
    const files = scripts.concat(EXTRAS.map(f => new URL(f, self.location.href).href)).filter(shouldSave);
    await Promise.all(files.map(async url => {
      try {
        const sameSite = url.startsWith(self.location.origin + '/');
        const res = await fetch(url, sameSite ? {} : { mode: 'no-cors' });
        if (res.ok || res.type === 'opaque') await cache.put(url, res);
      } catch (e) { } // one missing file shouldn't stop the rest
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !shouldSave(req.url)) return; // Firebase traffic, analytics etc. go straight through
  event.respondWith(newestFirst(event, req));
});

// Ask the website first. Fall back to the saved copy when offline, or when
// the website takes more than 4 seconds to answer.
async function newestFirst(event, req) {
  const cache = await caches.open(CACHE);
  const page = req.mode === 'navigate';
  const fromNetwork = fetch(req, page ? { cache: 'no-cache' } : {}).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      event.waitUntil(cache.put(page ? pageKey(req) : req, copy));
    }
    return res;
  });
  const saved = () => page
    ? cache.match(pageKey(req)).then(r => r || cache.match('./'))
    : cache.match(req).then(r => r || cache.match(req, { ignoreSearch: true }));

  try {
    return await Promise.race([fromNetwork, new Promise((_, fail) => setTimeout(fail, 4000))]);
  } catch (e) {
    return (await saved()) || fromNetwork; // nothing saved yet: keep waiting for the website
  }
}

// "/", "/index.html" and "/?room=ABCDE" are all the same game page.
function pageKey(req) {
  const url = new URL(req.url);
  return url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') ? './' : url.origin + url.pathname;
}
