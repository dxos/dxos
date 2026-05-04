//
// Copyright 2026 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';

import * as PluginAssetCache from './plugin-asset-cache';
import * as Plugin from './plugin';
import * as UrlLoader from './url-loader';

const testMeta = { id: 'org.dxos.plugin.test', name: 'Test' };

const memoryStorage = (initial: string | null = null): UrlLoader.Storage => {
  let value = initial;
  return {
    get: () => value,
    set: (_key, next) => {
      value = next;
    },
  };
};

type CacheCall = { method: 'cache' | 'evict' | 'resolve'; pluginId: string; urls?: readonly string[]; url?: string };

const recordingCache = (): { cache: PluginAssetCache.Cache; calls: CacheCall[] } => {
  const calls: CacheCall[] = [];
  return {
    calls,
    cache: {
      cache: (pluginId, urls) =>
        Effect.sync(() => {
          calls.push({ method: 'cache', pluginId, urls });
        }),
      evict: (pluginId) =>
        Effect.sync(() => {
          calls.push({ method: 'evict', pluginId });
        }),
      resolve: (pluginId, url) =>
        Effect.sync(() => {
          calls.push({ method: 'resolve', pluginId, url });
          return url;
        }),
      list: () => Effect.succeed([] as readonly string[]),
    },
  };
};

describe('UrlLoader', () => {
  describe('isLocalUrl', () => {
    it('matches localhost, 127.0.0.1, and ::1', ({ expect }) => {
      expect(UrlLoader.isLocalUrl('http://localhost:5173/plugin.mjs')).toBe(true);
      expect(UrlLoader.isLocalUrl('https://LOCALHOST/plugin.mjs')).toBe(true);
      expect(UrlLoader.isLocalUrl('http://127.0.0.1:8080/plugin.mjs')).toBe(true);
      expect(UrlLoader.isLocalUrl('http://[::1]:8080/plugin.mjs')).toBe(true);
    });

    it('rejects public and malformed URLs', ({ expect }) => {
      expect(UrlLoader.isLocalUrl('https://example.com/plugin.mjs')).toBe(false);
      expect(UrlLoader.isLocalUrl('https://192.168.1.10/plugin.mjs')).toBe(false);
      expect(UrlLoader.isLocalUrl('not a url')).toBe(false);
      expect(UrlLoader.isLocalUrl('')).toBe(false);
    });
  });

  describe('getRemoteEntries', () => {
    it('returns persisted entries from storage', ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '[{"id":"p1","url":"http://localhost:5173/p.mjs"}]',
        set: () => {},
      };
      expect(UrlLoader.getRemoteEntries({ storage })).toEqual([{ id: 'p1', url: 'http://localhost:5173/p.mjs' }]);
    });

    it('returns an empty array when storage is empty or malformed', ({ expect }) => {
      const empty: UrlLoader.Storage = { get: () => null, set: () => {} };
      const malformed: UrlLoader.Storage = { get: () => '{not json', set: () => {} };
      expect(UrlLoader.getRemoteEntries({ storage: empty })).toEqual([]);
      expect(UrlLoader.getRemoteEntries({ storage: malformed })).toEqual([]);
    });
  });

  describe('make', () => {
    it.effect('resolves built-in plugins by meta.id', () =>
      Effect.gen(function* () {
        const testPlugin = Plugin.make(Plugin.define(testMeta))();
        const loader = UrlLoader.make([testPlugin]);
        const result = yield* loader(testMeta.id);
        assert.strictEqual(result.meta.id, testMeta.id);
      }),
    );

    it.effect('fails for unknown non-URL locator', () =>
      Effect.gen(function* () {
        const loader = UrlLoader.make([]);
        const exit = yield* Effect.exit(loader('not-a-url'));
        assert.isTrue(exit._tag === 'Failure');
      }),
    );
  });

  describe('preload', () => {
    it('returns empty array when storage has no entries', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => null,
        set: () => {},
      };
      const result = await runAndForwardErrors(UrlLoader.preload({ storage }));
      expect(result).toEqual([]);
    });

    it('returns empty array when storage has invalid JSON', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '{{invalid json',
        set: () => {},
      };
      const result = await runAndForwardErrors(UrlLoader.preload({ storage }));
      expect(result).toEqual([]);
    });

    it('returns empty array when storage contains null', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => 'null',
        set: () => {},
      };
      const result = await runAndForwardErrors(UrlLoader.preload({ storage }));
      expect(result).toEqual([]);
    });

    it('returns empty array when storage contains an object', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '{}',
        set: () => {},
      };
      const result = await runAndForwardErrors(UrlLoader.preload({ storage }));
      expect(result).toEqual([]);
    });

    it('returns empty array when entries are missing required fields', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '[{"title":"no url"}]',
        set: () => {},
      };
      const result = await runAndForwardErrors(UrlLoader.preload({ storage }));
      expect(result).toEqual([]);
    });
  });

  describe('uninstall', () => {
    it('removes the persisted entry and evicts cached assets', async ({ expect }) => {
      const storage = memoryStorage('[{"id":"p1","url":"https://x/p1.json"},{"id":"p2","url":"https://x/p2.json"}]');
      const { cache, calls } = recordingCache();
      await runAndForwardErrors(UrlLoader.uninstall('p1', { storage, cache }));
      expect(UrlLoader.getRemoteEntries({ storage })).toEqual([{ id: 'p2', url: 'https://x/p2.json' }]);
      expect(calls).toEqual([{ method: 'evict', pluginId: 'p1' }]);
    });

    it('still removes entry when cache eviction fails', async ({ expect }) => {
      const storage = memoryStorage('[{"id":"p1","url":"https://x/p1.json"}]');
      const cache: PluginAssetCache.Cache = {
        cache: () => Effect.void,
        evict: () =>
          Effect.fail(
            new PluginAssetCache.PluginAssetCacheError({
              context: { operation: 'evict', pluginId: 'p1' },
              cause: 'boom',
            }),
          ),
        resolve: (_id, url) => Effect.succeed(url),
        list: () => Effect.succeed([] as readonly string[]),
      };
      await runAndForwardErrors(UrlLoader.uninstall('p1', { storage, cache }));
      expect(UrlLoader.getRemoteEntries({ storage })).toEqual([]);
    });
  });
});
