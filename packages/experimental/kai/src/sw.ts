//
// Copyright 2022 DXOS.org
//

// Chrome > Devtools > Application > Manifest | Service Workers (Update on reload)
// chrome://serviceworker-internals > Inspect

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches
      .open('kai')
      .then((cache) => cache.addAll(['/index.html', '/main.js']))
  );
});

self.addEventListener('fetch', (event: any) => {
  console.log(event.request.url);
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

console.log('Service worker started.');
