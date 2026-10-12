//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, test, vi } from 'vitest';

import { type LocalBlobStore, createMemoryBlobStore } from '@dxos/blob';
import * as EffectEx from '@dxos/effect/EffectEx';
import { makeInProcessClient } from '@dxos/protocols';
import { BlobStoreService } from '@dxos/protocols/rpc';

import { type BlobReplication, BlobReplicationNoopLayer, BlobReplicationService } from './blob-replication.ts';
import { BlobStoreServiceLayer } from './blob-store-service.ts';
import { LocalBlobStoreService } from './local-blob-store.ts';

/** Runs `body` against the service over an in-process RPC client, with replication only if given. */
const withService = (
  local: LocalBlobStore,
  replication: BlobReplication | undefined,
  body: (client: BlobStoreService.Client) => Effect.Effect<void, unknown>,
) => {
  const localLayer = Layer.succeed(LocalBlobStoreService, local);
  const dependencies = Layer.mergeAll(
    localLayer,
    replication
      ? Layer.succeed(BlobReplicationService, replication)
      : BlobReplicationNoopLayer.pipe(Layer.provide(localLayer)),
  );
  return EffectEx.runPromise(
    Effect.gen(function* () {
      const handlers = yield* BlobStoreService.Tag;
      yield* body(yield* makeInProcessClient(BlobStoreService.Rpcs, handlers));
    }).pipe(Effect.provide(BlobStoreServiceLayer.pipe(Layer.provide(dependencies))), Effect.scoped),
  );
};

describe('BlobStoreService', () => {
  test('with the noop replication, writes and reads are served by the local store alone', async () => {
    const local = createMemoryBlobStore();
    await withService(local, undefined, (client) =>
      Effect.gen(function* () {
        yield* client['BlobStoreService.put']({ key: 'aa', data: new Uint8Array([1]) });
        expect(yield* client['BlobStoreService.get']({ key: 'aa' })).toEqual({ blob: { data: new Uint8Array([1]) } });
        expect(yield* client['BlobStoreService.get']({ key: 'bb' })).toEqual({});
        expect(yield* client['BlobStoreService.has']({ key: 'aa' })).toEqual({ exists: true });
      }),
    );
    expect(await local.listPending({ limit: 10 })).toEqual(['aa']);
  });

  test('with replication, a write is stored locally before replication is woken, and reads go through it', async () => {
    const local = createMemoryBlobStore();
    const remote = createMemoryBlobStore();
    await remote.put('bb', new Uint8Array([2]));
    // What the local store held at the moment replication was told, to show confirmation comes first.
    const storedWhenWoken: Promise<boolean>[] = [];
    const wake = vi.fn(() => {
      storedWhenWoken.push(local.has('aa'));
    });
    const replication: BlobReplication = {
      store: { put: local.put, get: async (key) => (await local.get(key)) ?? remote.get(key), has: local.has },
      wake,
    };

    await withService(local, replication, (client) =>
      Effect.gen(function* () {
        yield* client['BlobStoreService.put']({ key: 'aa', data: new Uint8Array([1]) });
        expect(wake).toHaveBeenCalledTimes(1);
        expect(yield* Effect.promise(() => Promise.all(storedWhenWoken))).toEqual([true]);
        expect(yield* client['BlobStoreService.get']({ key: 'bb' })).toEqual({ blob: { data: new Uint8Array([2]) } });
      }),
    );
  });
});
