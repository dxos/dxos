//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { type LocalBlobStore } from '@dxos/blob';
import * as EffectEx from '@dxos/effect/EffectEx';
import { layerMemory } from '@dxos/sql-sqlite/Platform';

import { makeLocalBlobStore, migrateBlobStore } from './local-blob-store.ts';

const withStore = (body: (store: LocalBlobStore) => Promise<void>) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      yield* migrateBlobStore;
      const store = yield* makeLocalBlobStore;
      yield* Effect.promise(() => body(store));
    }).pipe(Effect.provide(layerMemory), Effect.orDie),
  );

describe('LocalBlobStore', () => {
  test('stores bytes and reports them pending until uploaded', () =>
    withStore(async (store) => {
      const data = new Uint8Array([1, 2, 3]);
      await store.put('aa', data, { contentType: 'image/png' });
      await store.put('bb', new Uint8Array([4]));

      const blob = await store.get('aa');
      expect(blob?.contentType).toBe('image/png');
      expect(new Uint8Array(blob?.data ?? [])).toEqual(data);
      expect((await store.get('bb'))?.contentType).toBeUndefined();
      expect(await store.get('cc')).toBeUndefined();
      expect(await store.has('aa')).toBe(true);
      expect(await store.has('cc')).toBe(false);

      expect(await store.listPending({ limit: 10 })).toEqual(['aa', 'bb']);
      expect(await store.listPending({ limit: 1 })).toEqual(['aa']);

      await store.markUploaded('aa');
      expect(await store.listPending({ limit: 10 })).toEqual(['bb']);
    }));

  test('a repeated write never clears an upload, and a read-through fill is not pending', () =>
    withStore(async (store) => {
      await store.put('aa', new Uint8Array([1]), { uploaded: true });
      await store.put('aa', new Uint8Array([1]), { contentType: 'text/plain' });

      expect(await store.listPending({ limit: 10 })).toEqual([]);
      expect((await store.get('aa'))?.contentType).toBe('text/plain');
    }));
});
