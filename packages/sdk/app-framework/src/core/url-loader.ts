//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import * as Plugin from './plugin';
import * as PluginAssetCache from './plugin-asset-cache';
import * as PluginManifest from './plugin-manifest';

const DEFAULT_KEY = 'org.dxos.composer.remote-plugins';

/**
 * Tagged error for any failure during remote plugin loading. Construction sites
 * set `context.locator` and `context.reason` (one of `'invalid-locator' |
 * 'manifest-error' | 'cache-error' | 'import-failed' | 'meta-missing' |
 * 'meta-mismatch' | 'duplicate-id'`) so handlers can route on the failure mode.
 */
export class RemotePluginLoadError extends BaseError.extend('RemotePluginLoadError', 'Failed to load remote plugin') {}

/**
 * Abstraction over key-value storage (defaults to localStorage).
 */
export type Storage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

/**
 * Options for configuring the URL loader.
 */
export type Options = {
  storage?: Storage;
  key?: string;
  /**
   * Per-platform offline asset cache. Defaults to a no-op cache (no offline support).
   */
  cache?: PluginAssetCache.Cache;
};

/**
 * Persisted record of a remote plugin that has been loaded previously.
 *
 * `url` is the URL of the plugin manifest (`plugin.json`), not the entry module.
 */
export type RemotePluginEntry = {
  id: string;
  url: string;
};

const defaultStorage = (): Storage => ({
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
});

const getPersistedRemotePlugins = (storage: Storage, key: string): RemotePluginEntry[] => {
  try {
    const parsed: unknown = JSON.parse(storage.get(key) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is RemotePluginEntry =>
        typeof entry === 'object' && entry !== null && typeof entry.id === 'string' && typeof entry.url === 'string',
    );
  } catch {
    return [];
  }
};

const persistRemotePlugin = (storage: Storage, key: string, entry: RemotePluginEntry): void => {
  try {
    const entries = getPersistedRemotePlugins(storage, key).filter((existing) => existing.id !== entry.id);
    entries.push(entry);
    storage.set(key, JSON.stringify(entries));
  } catch (error) {
    log.warn('failed to persist remote plugin entry', { entry, error });
  }
};

const removePersistedRemotePlugin = (storage: Storage, key: string, pluginId: string): void => {
  try {
    const entries = getPersistedRemotePlugins(storage, key).filter((existing) => existing.id !== pluginId);
    storage.set(key, JSON.stringify(entries));
  } catch (error) {
    log.warn('failed to remove remote plugin entry', { pluginId, error });
  }
};

const isUrl = (locator: string): boolean => {
  try {
    const url = new URL(locator);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Returns true when the URL's hostname is the local host (localhost, 127.0.0.1, or ::1).
 */
export const isLocalUrl = (locator: string): boolean => {
  try {
    const hostname = new URL(locator).hostname.toLowerCase();
    // WHATWG URL returns '::1' without brackets in Node; some browsers return '[::1]'.
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

/**
 * Returns the list of remote plugin entries previously persisted by {@link make}.
 * Useful for UI code that needs to know which loaded plugins were installed from a URL
 * (e.g. to surface a tag on remote or localhost-hosted plugins).
 */
export const getRemoteEntries = (options: Options = {}): readonly RemotePluginEntry[] => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;
  return getPersistedRemotePlugins(storage, key);
};

const normalizePluginExport = (mod: Record<string, unknown>): Plugin.Plugin => {
  const exported = mod.default;
  if (Plugin.isPlugin(exported)) {
    return exported;
  }
  if (typeof exported === 'function') {
    const result = (exported as () => unknown)();
    if (Plugin.isPlugin(result)) {
      return result;
    }
  }
  throw new Error('Remote module default export is not a Plugin or a zero-arg plugin factory.');
};

/**
 * Loads stylesheets declared in the manifest by appending `<link rel="stylesheet">` elements to the host document.
 * Each link is tagged with `data-dxos-plugin-id` so `uninstall` can clean them up.
 */
const loadStylesheets = (
  manifest: PluginManifest.ResolvedManifest,
  cache: PluginAssetCache.Cache,
): Effect.Effect<void, PluginAssetCache.PluginAssetCacheError> =>
  Effect.gen(function* () {
    if (typeof document === 'undefined') {
      return;
    }
    const cssUrls = manifest.assetUrls.filter((url) => url.endsWith('.css'));
    for (const url of cssUrls) {
      const resolved = yield* cache.resolve(manifest.id, url);
      if (document.querySelector(`link[data-dxos-plugin-id="${manifest.id}"][href="${resolved}"]`)) {
        continue;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = resolved;
      link.dataset.dxosPluginId = manifest.id;
      document.head.appendChild(link);
    }
  });

const loadFromManifest = (
  manifestUrl: string,
  cache: PluginAssetCache.Cache,
): Effect.Effect<{ plugin: Plugin.Plugin; manifest: PluginManifest.ResolvedManifest }, RemotePluginLoadError> =>
  Effect.gen(function* () {
    log.info('loading remote plugin', { manifestUrl });
    const manifest = yield* PluginManifest.fetchManifest(manifestUrl).pipe(
      Effect.mapError(
        (cause) => new RemotePluginLoadError({ context: { locator: manifestUrl, reason: 'manifest-error' }, cause }),
      ),
    );
    // Cache the manifest URL alongside its declared assets. Without it, `preload` on a
    // subsequent reload would fetch the manifest from the network — and fail when the
    // plugin's host is offline, dropping the plugin from the runtime.
    const cachedUrls =
      manifest.assetUrls.indexOf(manifestUrl) === -1 ? [manifestUrl, ...manifest.assetUrls] : manifest.assetUrls;
    const wrapCacheError = Effect.mapError(
      (cause: PluginAssetCache.PluginAssetCacheError) =>
        new RemotePluginLoadError({ context: { locator: manifestUrl, reason: 'cache-error' }, cause }),
    );
    yield* cache.cache(manifest.id, cachedUrls).pipe(wrapCacheError);
    yield* loadStylesheets(manifest, cache).pipe(wrapCacheError);
    const entryUrl = yield* cache.resolve(manifest.id, manifest.entryUrl).pipe(wrapCacheError);
    const mod = yield* Effect.tryPromise({
      try: () => import(/* @vite-ignore */ entryUrl),
      catch: (cause) =>
        new RemotePluginLoadError({ context: { locator: manifestUrl, reason: 'import-failed' }, cause }),
    });
    const plugin = normalizePluginExport(mod);
    if (!plugin.meta.id || !plugin.meta.name) {
      return yield* Effect.fail(
        new RemotePluginLoadError({ context: { locator: manifestUrl, reason: 'meta-missing' } }),
      );
    }
    if (plugin.meta.id !== manifest.id) {
      return yield* Effect.fail(
        new RemotePluginLoadError({
          context: {
            locator: manifestUrl,
            reason: 'meta-mismatch',
            metaId: plugin.meta.id,
            manifestId: manifest.id,
          },
        }),
      );
    }
    return { plugin, manifest };
  });

/**
 * Preloads previously persisted remote plugins from storage. Per-entry failures
 * are logged and swallowed — the returned effect always succeeds with whichever
 * plugins loaded cleanly, so a single bad entry can't block the host's startup.
 */
export const preload = (options: Options = {}): Effect.Effect<Plugin.Plugin[], never> =>
  Effect.gen(function* () {
    const storage = options.storage ?? defaultStorage();
    const key = options.key ?? DEFAULT_KEY;
    const cache = options.cache ?? PluginAssetCache.noop();

    const entries = getPersistedRemotePlugins(storage, key);
    if (entries.length === 0) {
      return [];
    }
    log.info('preloading remote plugins', { count: entries.length });
    const results = yield* Effect.all(
      entries.map((entry) =>
        loadFromManifest(entry.url, cache).pipe(
          Effect.tapError((error) => Effect.sync(() => log.warn('failed to preload remote plugin', { entry, error }))),
          Effect.option,
        ),
      ),
      { concurrency: 'unbounded' },
    );
    return results.flatMap((result) =>
      Option.match(result, {
        onNone: () => [],
        onSome: ({ plugin }) => [plugin],
      }),
    );
  });

/**
 * Creates a plugin loader that resolves built-in plugins by ID or loads remote plugins from URLs.
 *
 * Remote URLs must point at a plugin manifest (`plugin.json`). The loader fetches the manifest,
 * eagerly persists every declared asset via the configured `PluginAssetCache`, then dynamic-imports
 * the entry module.
 */
export const make = (builtinPlugins: Plugin.Plugin[], options: Options = {}) => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;
  const cache = options.cache ?? PluginAssetCache.noop();

  return (locator: string): Effect.Effect<Plugin.Plugin, RemotePluginLoadError> =>
    Effect.gen(function* () {
      const builtin = builtinPlugins.find((plugin) => plugin.meta.id === locator);
      if (builtin) {
        return builtin;
      }
      if (!isUrl(locator)) {
        return yield* Effect.fail(new RemotePluginLoadError({ context: { locator, reason: 'invalid-locator' } }));
      }
      const { plugin } = yield* loadFromManifest(locator, cache);
      const duplicate = builtinPlugins.find((existing) => existing.meta.id === plugin.meta.id);
      if (duplicate) {
        return yield* Effect.fail(
          new RemotePluginLoadError({ context: { locator, reason: 'duplicate-id', id: plugin.meta.id } }),
        );
      }
      persistRemotePlugin(storage, key, { id: plugin.meta.id, url: locator });
      return plugin;
    });
};

/**
 * Removes a previously installed remote plugin: drops the persisted entry, evicts cached
 * assets, and removes any stylesheet `<link>` tags that {@link loadFromManifest} appended.
 *
 * Cache eviction failures are logged and swallowed — the persisted entry has already been
 * dropped so the user-visible state is consistent regardless of whether the platform
 * cache cooperated.
 */
export const uninstall = (pluginId: string, options: Options = {}): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const storage = options.storage ?? defaultStorage();
    const key = options.key ?? DEFAULT_KEY;
    const cache = options.cache ?? PluginAssetCache.noop();

    removePersistedRemotePlugin(storage, key, pluginId);
    if (typeof document !== 'undefined') {
      document.querySelectorAll(`link[data-dxos-plugin-id="${pluginId}"]`).forEach((node) => node.remove());
    }
    yield* cache.evict(pluginId).pipe(
      Effect.tapError((error) => Effect.sync(() => log.warn('failed to evict plugin assets', { pluginId, error }))),
      Effect.ignore,
    );
  });
