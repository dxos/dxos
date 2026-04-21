//
// Copyright 2026 DXOS.org
//

import { assert, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Plugin from './plugin';
import * as UrlLoader from './url-loader';

const testMeta = { id: 'org.dxos.plugin.test', name: 'Test' };

describe('UrlLoader', () => {
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
      const result = await UrlLoader.preload({ storage });
      expect(result).toEqual([]);
    });

    it('returns empty array when storage has invalid JSON', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '{{invalid json',
        set: () => {},
      };
      const result = await UrlLoader.preload({ storage });
      expect(result).toEqual([]);
    });

    it('returns empty array when storage contains null', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => 'null',
        set: () => {},
      };
      const result = await UrlLoader.preload({ storage });
      expect(result).toEqual([]);
    });

    it('returns empty array when storage contains an object', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '{}',
        set: () => {},
      };
      const result = await UrlLoader.preload({ storage });
      expect(result).toEqual([]);
    });

    it('returns empty array when entries are missing required fields', async ({ expect }) => {
      const storage: UrlLoader.Storage = {
        get: () => '[{"title":"no url"}]',
        set: () => {},
      };
      const result = await UrlLoader.preload({ storage });
      expect(result).toEqual([]);
    });
  });
});
