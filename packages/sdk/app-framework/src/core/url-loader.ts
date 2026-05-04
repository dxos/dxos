//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import * as PluginAssetCache from './plugin-asset-cache';
import * as PluginManifest from './plugin-manifest';
import * as Plugin from './plugin';

const DEFAULT_KEY = 'org.dxos.composer.remote-plugins';

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
 * Loads stylesheet assets declared in the manifest by appending `<link rel="stylesheet">`
 * elements to the host document. The plugin bundle no longer self-injects CSS (vite-plugin-
 * css-injected-by-js was dropped when we moved to multi-asset distribution), so the host
 * is responsible for wiring up sibling CSS. Each link is tagged with `data-dxos-plugin-id`
 * so `uninstall` can clean them up.
 */
const loadStylesheets = async (
  manifest: PluginManifest.ResolvedManifest,
  cache: PluginAssetCache.Cache,
): Promise<void> => {
  if (typeof document === 'undefined') {
    return;
  }
  const cssUrls = manifest.assetUrls.filter((url) => url.endsWith('.css'));
  for (const url of cssUrls) {
    const resolved = await cache.resolve(manifest.id, url);
    if (document.querySelector(`link[data-dxos-plugin-id="${manifest.id}"][href="${resolved}"]`)) {
      continue;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resolved;
    link.dataset.dxosPluginId = manifest.id;
    document.head.appendChild(link);
  }
};

const loadFromManifest = async (
  manifestUrl: string,
  cache: PluginAssetCache.Cache,
): Promise<{ plugin: Plugin.Plugin; manifest: PluginManifest.ResolvedManifest }> => {
  log.info('loading remote plugin', { manifestUrl });
  const manifest = await PluginManifest.fetchManifest(manifestUrl);
  await cache.cache(manifest.id, manifest.assetUrls);
  await loadStylesheets(manifest, cache);
  const entryUrl = await cache.resolve(manifest.id, manifest.entryUrl);
  const mod = await import(/* @vite-ignore */ entryUrl);
  const plugin = normalizePluginExport(mod);
  if (!plugin.meta.id || !plugin.meta.name) {
    throw new Error(`Remote plugin at ${manifestUrl} is missing required meta.id or meta.name.`);
  }
  if (plugin.meta.id !== manifest.id) {
    throw new Error(
      `Plugin meta.id (${plugin.meta.id}) does not match manifest id (${manifest.id}) at ${manifestUrl}.`,
    );
  }
  return { plugin, manifest };
};

/**
 * Preloads previously persisted remote plugins from storage.
 */
export const preload = async (options: Options = {}): Promise<Plugin.Plugin[]> => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;
  const cache = options.cache ?? PluginAssetCache.noop();

  const entries = getPersistedRemotePlugins(storage, key);
  if (entries.length === 0) {
    return [];
  }
  log.info('preloading remote plugins', { count: entries.length });
  const results = await Promise.allSettled(entries.map((entry) => loadFromManifest(entry.url, cache)));
  const plugins: Plugin.Plugin[] = [];
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === 'fulfilled') {
      plugins.push(result.value.plugin);
    } else {
      log.warn('failed to preload remote plugin', { entry: entries[index], error: result.reason });
    }
  }
  return plugins;
};

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

  return (locator: string): Effect.Effect<Plugin.Plugin, Error> =>
    Effect.gen(function* () {
      const builtin = builtinPlugins.find((plugin) => plugin.meta.id === locator);
      if (builtin) {
        return builtin;
      }
      if (!isUrl(locator)) {
        return yield* Effect.fail(new Error(`Plugin not found and locator is not a URL: ${locator}`));
      }
      const result = yield* Effect.tryPromise({
        try: () => loadFromManifest(locator, cache),
        catch: (error) => new Error(`Failed to load remote plugin from ${locator}: ${error}`),
      });
      const { plugin } = result;
      const duplicate = builtinPlugins.find((existing) => existing.meta.id === plugin.meta.id);
      if (duplicate) {
        return yield* Effect.fail(
          new Error(`Remote plugin ${plugin.meta.id} conflicts with built-in plugin of the same id.`),
        );
      }
      persistRemotePlugin(storage, key, { id: plugin.meta.id, url: locator });
      return plugin;
    });
};

/**
 * Removes a previously installed remote plugin: drops the persisted entry, evicts cached
 * assets, and removes any stylesheet `<link>` tags that {@link loadFromManifest} appended.
 */
export const uninstall = async (pluginId: string, options: Options = {}): Promise<void> => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;
  const cache = options.cache ?? PluginAssetCache.noop();

  removePersistedRemotePlugin(storage, key, pluginId);
  if (typeof document !== 'undefined') {
    document.querySelectorAll(`link[data-dxos-plugin-id="${pluginId}"]`).forEach((node) => node.remove());
  }
  try {
    await cache.evict(pluginId);
  } catch (error) {
    log.warn('failed to evict plugin assets', { pluginId, error });
  }
};
