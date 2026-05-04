//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by VitePWA at build time (the app shell).
//
// `ignoreURLParametersMatching` lets the precache router serve `icons.svg?nocache=N`
// (and any other cache-busting query the host adds at runtime) from the precached
// `icons.svg` entry. Without this, query-bearing URLs miss the precache and fall
// through to the network — a guaranteed offline failure for the icons sprite.
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/^nocache$/],
});
cleanupOutdatedCaches();

// SPA navigation fallback. Composer's deep URLs (e.g. `/<spaceId>/types/...`) aren't direct
// precache entries — without this, offline navigations 404. The handler routes all
// `mode: 'navigate'` requests to the precached `/index.html`, which boots the SPA and
// resolves the route client-side.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

const PLUGIN_ASSET_CACHE = 'dxos-plugin-assets-v1';
const INDEX_DB_NAME = 'dxos-plugin-asset-index';
const INDEX_STORE = 'plugin-urls';

type AssetCacheMessage =
  | { type: 'dxos:cache-plugin-assets'; pluginId: string; urls: readonly string[] }
  | { type: 'dxos:evict-plugin'; pluginId: string }
  | { type: 'dxos:list-plugins' };

const openIndex = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEX_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(INDEX_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openIndex();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEX_STORE, 'readonly');
    const request = tx.objectStore(INDEX_STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
};

const idbPut = async (key: string, value: unknown): Promise<void> => {
  const db = await openIndex();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEX_STORE, 'readwrite');
    tx.objectStore(INDEX_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (key: string): Promise<void> => {
  const db = await openIndex();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEX_STORE, 'readwrite');
    tx.objectStore(INDEX_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbKeys = async (): Promise<string[]> => {
  const db = await openIndex();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEX_STORE, 'readonly');
    const request = tx.objectStore(INDEX_STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
};

/**
 * In-memory mirror of the plugin-asset URL set so the fetch handler can decide
 * synchronously whether to take ownership of an event. Without this we'd have to
 * `event.respondWith` for every GET (since the IDB lookup is async), which preempts
 * Workbox's precache routing — the original cause of "site can't be reached" when
 * offline. Updated alongside IDB on every cache/evict message.
 */
const pluginAssetUrls = new Set<string>();

const refreshPluginAssetUrls = async (): Promise<void> => {
  const ids = await idbKeys();
  pluginAssetUrls.clear();
  for (const id of ids) {
    const urls = await idbGet<string[]>(id);
    urls?.forEach((url) => pluginAssetUrls.add(url));
  }
};

const cachePluginAssets = async (pluginId: string, urls: readonly string[]): Promise<void> => {
  const cache = await caches.open(PLUGIN_ASSET_CACHE);
  // Always register the URLs so the fetch handler will intercept them, even if some
  // can't be fetched right now (e.g. offline reload re-running cache.cache during
  // preload). The host loader's `import(entryUrl)` only needs the entry to be in
  // cache; the rest are nice-to-haves.
  urls.forEach((url) => pluginAssetUrls.add(url));
  await idbPut(pluginId, urls);
  // Per-URL fetching, tolerant: skip URLs already cached, and let individual failures
  // (e.g. a single unreachable asset while offline) pass through without aborting the
  // batch. Replaces `cache.addAll` which is atomic — one offline URL would otherwise
  // wipe out an entire successful precache for an installed plugin.
  await Promise.all(
    urls.map(async (url) => {
      const request = new Request(url, { credentials: 'omit' });
      if (await cache.match(request)) {
        return;
      }
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch {
        // Best effort — surfaces as a stale cache miss later, not a fatal error.
      }
    }),
  );
};

const evictPlugin = async (pluginId: string): Promise<void> => {
  const urls = (await idbGet<string[]>(pluginId)) ?? [];
  const cache = await caches.open(PLUGIN_ASSET_CACHE);
  await Promise.all(urls.map((url) => cache.delete(url)));
  await idbDelete(pluginId);
  // Rebuild the set from IDB so URLs shared between plugins (unlikely but possible)
  // aren't dropped from memory while still claimed by another plugin.
  await refreshPluginAssetUrls();
};

self.addEventListener('message', (event) => {
  const data = event.data as AssetCacheMessage | undefined;
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return;
  }
  const port = event.ports[0];
  const respond = (result: unknown) => port?.postMessage({ ok: true, result });
  const fail = (error: unknown) => port?.postMessage({ ok: false, error: String(error) });

  switch (data.type) {
    case 'dxos:cache-plugin-assets':
      event.waitUntil(cachePluginAssets(data.pluginId, data.urls).then(() => respond(undefined), fail));
      break;
    case 'dxos:evict-plugin':
      event.waitUntil(evictPlugin(data.pluginId).then(() => respond(undefined), fail));
      break;
    case 'dxos:list-plugins':
      event.waitUntil(idbKeys().then(respond, fail));
      break;
  }
});

// Cache-first for any URL we've recorded as a plugin asset, with a stale-while-revalidate
// background refresh so updated bundles propagate without forcing an uninstall/reinstall.
//
// Critical: only call `event.respondWith` when we know the URL is a plugin asset. Calling
// it unconditionally claims the event for our handler, which (a) preempts Workbox's
// precache router for app-shell URLs and (b) breaks offline because the inner `fetch`
// rejects on no network. The synchronous `pluginAssetUrls.has(...)` check keeps us out of
// Workbox's way for everything else.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !pluginAssetUrls.has(request.url)) {
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(PLUGIN_ASSET_CACHE);
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);
      return cached ?? (await networkPromise) ?? new Response('Plugin asset unavailable offline', { status: 504 });
    })(),
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  // Hydrate the in-memory plugin-asset URL set from IDB before the SW starts handling
  // fetches. Without this, the first reload after activation would miss every plugin
  // asset until a cache-message replays them.
  event.waitUntil(Promise.all([self.clients.claim(), refreshPluginAssetUrls()]));
});
