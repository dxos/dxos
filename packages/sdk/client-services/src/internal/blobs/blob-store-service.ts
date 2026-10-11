//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { toServiceError } from '@dxos/protocols';
import { BlobStoreService } from '@dxos/protocols/rpc';

import { BlobReplicationService } from './blob-replication.ts';
import { LocalBlobStoreService } from './local-blob-store.ts';

/**
 * Serves `BlobStoreService` RPCs from the local blob store. A `put` is confirmed once the bytes are
 * stored locally; replication, when configured, is only told about it.
 */
export const BlobStoreServiceLayer: Layer.Layer<BlobStoreService.Tag, never, LocalBlobStoreService> = Layer.effect(
  BlobStoreService.Tag,
  Effect.gen(function* () {
    const local = yield* LocalBlobStoreService;
    const replication = Option.getOrUndefined(yield* Effect.serviceOption(BlobReplicationService));
    const store = replication?.store ?? local;

    const handlers: BlobStoreService.Handlers = {
      'BlobStoreService.put': ({ key, data, contentType }) =>
        Effect.tryPromise({ try: () => local.put(key, data, { contentType }), catch: toServiceError }).pipe(
          Effect.tap(() => Effect.sync(() => replication?.wake())),
        ),
      'BlobStoreService.get': ({ key }) =>
        Effect.tryPromise({ try: () => store.get(key), catch: toServiceError }).pipe(
          Effect.map((blob) => (blob ? { blob } : {})),
        ),
      'BlobStoreService.has': ({ key }) =>
        Effect.tryPromise({ try: () => store.has(key), catch: toServiceError }).pipe(
          Effect.map((exists) => ({ exists })),
        ),
    };
    return handlers;
  }),
);
