//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import { addPlugins, cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

const precacheManifest = self.__WB_MANIFEST;

// Workbox keys its precache by URL, so duplicate manifest entries collapse and fewer entries settle
// than the manifest lists. Counting unique URLs keeps the meter's denominator honest.
const precacheTotal = new Set(precacheManifest.map((entry) => (typeof entry === 'string' ? entry : entry.url))).size;

/**
 * Progress envelope consumed by `@dxos/plugin-pwa`'s update-progress module, which projects it into
 * the app's progress registry. Declared here rather than imported so the worker bundle stays free of
 * host code, mirroring `AssetCacheMessage` in `./asset-cache/service-worker.ts` — keep both in sync.
 */
const PRECACHE_PROGRESS = 'dxos:precache-progress';

/** Batches the per-entry ticks: a full manifest is thousands of entries, one message each is noise. */
const PROGRESS_POST_INTERVAL = 25;

// Sampled once at worker startup rather than per message: a worker evaluated alongside an active peer
// is an update, a first install has none. Read later it races activation — the first install has
// already become `active` by the time the completion handler runs, mislabelling itself an update.
const isUpdate = Boolean(self.registration.active);

// An installing worker controls no clients, so uncontrolled windows must be included or the page
// showing the meter never hears about the download it is waiting on.
const postPrecacheProgress = async (current: number, done: boolean): Promise<void> => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: PRECACHE_PROGRESS,
      current,
      total: precacheTotal,
      isUpdate,
      done,
    });
  }
};

let precached = 0;
const tickPrecache = (): void => {
  precached += 1;
  if (precached % PROGRESS_POST_INTERVAL === 0) {
    void postPrecacheProgress(precached, false);
  }
};

// Completion is taken from the worker's own lifecycle rather than the tick count reaching the total:
// an entry whose fetch fails settles through neither counting hook, which would strand the meter just
// short of full and leave the monitor in the registry forever. Reaching `installed` means precaching
// is over however many entries actually settled.
self.serviceWorker?.addEventListener('statechange', () => {
  if (self.serviceWorker.state === 'installed') {
    void postPrecacheProgress(precacheTotal, true);
  }
});

// Workbox precaches entries strictly one at a time and settles each through exactly one of these
// hooks — `cachedResponseWillBeUsed` with a hit when the entry is already cached, `cacheDidUpdate`
// once it has been downloaded — so counting both yields one tick per completed manifest entry. This
// is the only progress workbox exposes for the install-time download that *is* the app update.
addPlugins([
  {
    cachedResponseWillBeUsed: async ({ event, cachedResponse }) => {
      if (event?.type === 'install' && cachedResponse) {
        tickPrecache();
      }
      // The return value replaces the cached response; dropping it would make workbox re-download
      // every entry that is already precached.
      return cachedResponse;
    },
    cacheDidUpdate: async ({ event }) => {
      if (event?.type === 'install') {
        tickPrecache();
      }
    },
  },
]);

// Precache all assets injected by VitePWA at build time (the app shell).
//
// `ignoreURLParametersMatching` lets the precache router serve `icons.svg?nocache=N`
// (and any other cache-busting query the host adds at runtime) from the precached
// `icons.svg` entry. Without this, query-bearing URLs miss the precache and fall
// through to the network — a guaranteed offline failure for the icons sprite.
precacheAndRoute(precacheManifest, {
  ignoreURLParametersMatching: [/^nocache$/],
});
cleanupOutdatedCaches();

// SPA navigation fallback. Composer's deep URLs (e.g. `/<spaceId>/types/...`) aren't direct
// precache entries — without this, offline navigations 404. The handler routes all
// `mode: 'navigate'` requests to the precached `/index.html`, which boots the SPA and
// resolves the route client-side.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

const PHOSPHOR_CACHE = 'dxos-phosphor-icons-v1';

// Cache-first for the on-demand Phosphor catalog served under /phosphor/ (see
// phosphorAssetsPlugin in vite.config.ts). The catalog is ~9,000 immutable SVGs — far too
// many to precache without an install-time request per file — so each icon is cached on
// first fetch, making every icon the app has actually rendered available offline.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/phosphor/'),
  async ({ request }) => {
    const cache = await caches.open(PHOSPHOR_CACHE);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
      void cache.put(request, response.clone());
    }
    return response;
  },
);

const PLUGIN_ASSET_CACHE = 'dxos-plugin-assets-v1';
const INDEX_DB_NAME = 'dxos-plugin-asset-index';
const INDEX_STORE = 'plugin-urls';

type AssetCacheMessage =
  | { type: 'dxos:cache-plugin-assets'; pluginId: string; urls: readonly string[] }
  | { type: 'dxos:evict-plugin'; pluginId: string }
  | { type: 'dxos:list-plugins' };

/**
 * Control message workbox-window posts (via `Workbox.messageSkipWaiting`) when the user accepts
 * plugin-pwa's refresh toast. `injectManifest` builds ship no handler for it — unlike `generateSW`
 * builds, where workbox-build injects one — so the toast's action button is inert without this.
 */
const SKIP_WAITING = 'SKIP_WAITING';

// Lazy single-connection cache. The previous shape opened a fresh IDB connection
// per call (one per `idbGet` / `idbPut` / `idbDelete` / `idbKeys`) and never
// closed any of them — a real leak under heavy install/uninstall traffic since
// each call ran without the SW ever explicitly closing the handle. Caching the
// open promise lets the SW reuse a single connection for its lifetime; the
// browser tears it down when the SW is unregistered or evicted.
let dbPromise: Promise<IDBDatabase> | undefined;
const openIndex = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEX_DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(INDEX_STORE);
      request.onsuccess = () => {
        // If the connection is closed externally (e.g. another tab triggering a
        // version change), drop the cached promise so the next caller reopens.
        request.result.onclose = () => {
          dbPromise = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        dbPromise = undefined;
        reject(request.error);
      };
    });
  }
  return dbPromise;
};

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
  const data = event.data as AssetCacheMessage | { type: typeof SKIP_WAITING } | undefined;
  if (!data || typeof data !== 'object' || !('type' in data)) {
    return;
  }
  if (data.type === SKIP_WAITING) {
    void self.skipWaiting();
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

// Deliberately no `skipWaiting()` on install: workbox-window only reports an update once the new
// worker parks in `waiting` (it suppresses the event when the waiting phase is skipped), so
// self-activating here silently disabled plugin-pwa's `onNeedRefresh` toast. Activation is instead
// driven by the SKIP_WAITING message the toast's action sends.
self.addEventListener('activate', (event) => {
  // Hydrate the in-memory plugin-asset URL set from IDB before the SW starts handling
  // fetches. Without this, the first reload after activation would miss every plugin
  // asset until a cache-message replays them.
  event.waitUntil(Promise.all([self.clients.claim(), refreshPluginAssetUrls()]));
});
