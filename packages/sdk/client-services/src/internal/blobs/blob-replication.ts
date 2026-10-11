//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type BlobStore, type BlobTransport } from '@dxos/blob';
import { type BlobReplicator, createBlobReplicator, withReadThrough } from '@dxos/blob/hosted';
import { Context } from '@dxos/context';
import { type EdgeHttpClient, EdgeHttpClientService } from '@dxos/edge-client';
import * as Hook from '@dxos/effect/Hook';

import * as Events from '../../Events.ts';
import { LocalBlobStoreService } from './local-blob-store.ts';

/**
 * Replication of the local blob store with the EDGE blob service: pushes stored blobs asynchronously
 * and fills local misses. Present only when an EDGE endpoint is configured; without it the local
 * store is complete on its own.
 */
export interface BlobReplication {
  /** The local store, filling misses from EDGE and caching them. */
  readonly store: BlobStore;
  /** Signals that a blob was written locally and may need pushing; never waits on the network. */
  wake(): void;
}

export class BlobReplicationService extends EffectContext.Service<BlobReplicationService, BlobReplication>()(
  '@dxos/client-services/BlobReplication',
) {}

/**
 * Replication for a stack with no EDGE endpoint: reads are served by the local store alone and writes
 * stay in its ledger, to be pushed by a later session that has one.
 */
export const BlobReplicationNoopLayer: Layer.Layer<BlobReplicationService, never, LocalBlobStoreService> = Layer.effect(
  BlobReplicationService,
  Effect.gen(function* () {
    const local = yield* LocalBlobStoreService;
    return { store: local, wake: () => {} };
  }),
);

const edgeBlobTransport = (edge: EdgeHttpClient): BlobTransport => ({
  url: (key) => edge.getBlobUrl(key),
  put: (key, data, options) => edge.putBlob(Context.default(), key, data, options),
  get: (key) => edge.getBlob(Context.default(), key),
  has: (key) => edge.hasBlob(Context.default(), key),
});

export const BlobReplicationLayer: Layer.Layer<
  BlobReplicationService,
  never,
  LocalBlobStoreService | EdgeHttpClientService | Hook.Controller
> = Layer.effect(
  BlobReplicationService,
  Effect.gen(function* () {
    const local = yield* LocalBlobStoreService;
    const transport = edgeBlobTransport(yield* EdgeHttpClientService);

    // Started once the network identity is set, since EDGE authenticates uploads; writes before that
    // wait in the ledger.
    let replicator: BlobReplicator | undefined;
    yield* Hook.on(
      Events.NetworkReady,
      Effect.fn('BlobReplication.onNetworkReady')(function* () {
        replicator ??= createBlobReplicator({ local, transport });
        replicator.wake();
      }),
    );
    yield* Effect.addFinalizer(() => Effect.promise(async () => replicator?.close()));

    return {
      store: withReadThrough({ local, transport }),
      wake: () => replicator?.wake(),
    };
  }),
);
