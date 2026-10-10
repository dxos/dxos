//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { layerMemory } from '@dxos/sql-sqlite/Platform';

import { makeBlobStore, migrateBlobStore } from './blob-store-service.ts';

type BlobStore = Effect.Success<typeof makeBlobStore>;

const run = (body: (store: BlobStore) => Effect.Effect<void, unknown>) =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      yield* migrateBlobStore;
      yield* body(yield* makeBlobStore);
    }).pipe(Effect.provide(layerMemory), Effect.orDie),
  );

describe('BlobStoreService', () => {
  test('stores bytes and reports them pending until uploaded', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await run((store) =>
      Effect.gen(function* () {
        yield* store.put({ key: 'aa', data, contentType: 'image/png', uploaded: false });
        yield* store.put({ key: 'bb', data: new Uint8Array([4]), uploaded: false });

        const { blob } = yield* store.get({ key: 'aa' });
        expect(blob?.contentType).toBe('image/png');
        expect(new Uint8Array(blob?.data ?? [])).toEqual(data);
        expect((yield* store.get({ key: 'bb' })).blob?.contentType).toBeUndefined();
        expect(yield* store.get({ key: 'cc' })).toEqual({});
        expect(yield* store.has({ key: 'aa' })).toEqual({ exists: true });
        expect(yield* store.has({ key: 'cc' })).toEqual({ exists: false });

        expect(yield* store.listPending({ limit: 10 })).toEqual({ keys: ['aa', 'bb'] });
        expect(yield* store.listPending({ limit: 1 })).toEqual({ keys: ['aa'] });

        yield* store.markUploaded({ key: 'aa' });
        expect(yield* store.listPending({ limit: 10 })).toEqual({ keys: ['bb'] });
      }),
    );
  });

  test('a repeated write never clears an upload, and a read-through fill is not pending', async () => {
    await run((store) =>
      Effect.gen(function* () {
        yield* store.put({ key: 'aa', data: new Uint8Array([1]), uploaded: true });
        yield* store.put({ key: 'aa', data: new Uint8Array([1]), contentType: 'text/plain', uploaded: false });

        expect(yield* store.listPending({ limit: 10 })).toEqual({ keys: [] });
        expect((yield* store.get({ key: 'aa' })).blob?.contentType).toBe('text/plain');
      }),
    );
  });
});
