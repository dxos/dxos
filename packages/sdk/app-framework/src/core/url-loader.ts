//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

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
};

/**
 * Persisted record of a remote plugin that has been loaded previously.
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

const isUrl = (locator: string): boolean => {
  try {
    const url = new URL(locator);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const GITHUB_RELEASE_ASSET_PATH = /\/repos\/[^/]+\/[^/]+\/releases\/assets\/\d+$/;

/**
 * True when `locator` is a GitHub REST release-asset URL (`GET` + `Accept: application/octet-stream`
 * returns the file and is CORS-enabled). Plain `browser_download_url` values are not importable in
 * the browser because blob storage omits `Access-Control-Allow-Origin`.
 */
export const isGitHubReleaseAssetApiUrl = (locator: string): boolean => {
  try {
    const url = new URL(locator);
    return url.hostname === 'api.github.com' && GITHUB_RELEASE_ASSET_PATH.test(url.pathname);
  } catch {
    return false;
  }
};

const importGitHubReleaseAssetModule = async (assetApiUrl: string): Promise<Record<string, unknown>> => {
  const response = await fetch(assetApiUrl, {
    headers: {
      Accept: 'application/octet-stream',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub release asset request failed: ${response.status} ${response.statusText}`);
  }
  const source = await response.text();
  const blob = new Blob([source], { type: 'text/javascript' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    return (await import(/* @vite-ignore */ objectUrl)) as Record<string, unknown>;
  } finally {
    URL.revokeObjectURL(objectUrl);
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

const loadRemotePlugin = async (url: string): Promise<Plugin.Plugin> => {
  log.info('loading remote plugin', { url });
  const mod = isGitHubReleaseAssetApiUrl(url)
    ? await importGitHubReleaseAssetModule(url)
    : ((await import(/* @vite-ignore */ url)) as Record<string, unknown>);
  const plugin = normalizePluginExport(mod);
  if (!plugin.meta.id || !plugin.meta.name) {
    throw new Error(`Remote plugin at ${url} is missing required meta.id or meta.name.`);
  }
  return plugin;
};

/**
 * Preloads previously persisted remote plugins from storage.
 */
export const preload = async (options: Options = {}): Promise<Plugin.Plugin[]> => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;

  const entries = getPersistedRemotePlugins(storage, key);
  if (entries.length === 0) {
    return [];
  }
  log.info('preloading remote plugins', { count: entries.length });
  const results = await Promise.allSettled(entries.map((entry) => loadRemotePlugin(entry.url)));
  const plugins: Plugin.Plugin[] = [];
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === 'fulfilled') {
      plugins.push(result.value);
    } else {
      log.warn('failed to preload remote plugin', { entry: entries[index], error: result.reason });
    }
  }
  return plugins;
};

/**
 * Creates a plugin loader that resolves built-in plugins by ID or loads remote plugins from URLs.
 */
export const make = (builtinPlugins: Plugin.Plugin[], options: Options = {}) => {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;

  return (locator: string): Effect.Effect<Plugin.Plugin, Error> =>
    Effect.gen(function* () {
      const builtin = builtinPlugins.find((plugin) => plugin.meta.id === locator);
      if (builtin) {
        return builtin;
      }
      if (!isUrl(locator)) {
        return yield* Effect.fail(new Error(`Plugin not found and locator is not a URL: ${locator}`));
      }
      const plugin = yield* Effect.tryPromise({
        try: () => loadRemotePlugin(locator),
        catch: (error) => new Error(`Failed to load remote plugin from ${locator}: ${error}`),
      });
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
