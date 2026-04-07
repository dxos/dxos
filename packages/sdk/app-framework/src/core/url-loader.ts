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

type RemotePluginEntry = { id: string; url: string };

const defaultStorage = (): Storage => ({
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
});

const getPersistedRemotePlugins = (storage: Storage, key: string): RemotePluginEntry[] => {
  try {
    return JSON.parse(storage.get(key) ?? '[]');
  } catch {
    return [];
  }
};

const persistRemotePlugin = (storage: Storage, key: string, entry: RemotePluginEntry): void => {
  const entries = getPersistedRemotePlugins(storage, key).filter((existing) => existing.id !== entry.id);
  entries.push(entry);
  storage.set(key, JSON.stringify(entries));
};

const isUrl = (locator: string): boolean => {
  try {
    new URL(locator);
    return true;
  } catch {
    return false;
  }
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
  const mod = await import(/* @vite-ignore */ url);
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
