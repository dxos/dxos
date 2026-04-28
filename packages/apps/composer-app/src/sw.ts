//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by VitePWA at build time (the app shell).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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

const cachePluginAssets = async (pluginId: string, urls: readonly string[]): Promise<void> => {
  const cache = await caches.open(PLUGIN_ASSET_CACHE);
  // `addAll` is atomic — if any fetch fails, nothing is committed. That's the
  // right semantics for eager precache: a partial bundle is worse than no cache.
  await cache.addAll(urls.map((url) => new Request(url, { credentials: 'omit' })));
  await idbPut(pluginId, urls);
};

const evictPlugin = async (pluginId: string): Promise<void> => {
  const urls = (await idbGet<string[]>(pluginId)) ?? [];
  const cache = await caches.open(PLUGIN_ASSET_CACHE);
  await Promise.all(urls.map((url) => cache.delete(url)));
  await idbDelete(pluginId);
};

const isPluginAsset = async (url: string): Promise<boolean> => {
  const keys = await idbKeys();
  for (const pluginId of keys) {
    const urls = await idbGet<string[]>(pluginId);
    if (urls?.includes(url)) {
      return true;
    }
  }
  return false;
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
// background refresh so updated bundles propagate without forcing a full uninstall/reinstall.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  event.respondWith(
    (async () => {
      if (!(await isPluginAsset(request.url))) {
        return fetch(request);
      }
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
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
