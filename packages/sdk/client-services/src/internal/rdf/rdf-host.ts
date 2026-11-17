//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';

import * as RdfStore from '@dxos/echo-memory/RdfStore';
import { RdfStoreService } from '@dxos/protocols/rpc';

import { SpaceMemories } from './space-memories.ts';

/**
 * Serves `RdfStoreService` RPCs over each space's store: raw SPARQL, batches, and bulk export and import, which are
 * serialized and parsed here beside the store so a large store crosses the bridge once.
 */
export const RdfHostLayer: Layer.Layer<RdfStoreService.Tag, never, SpaceMemories> = Layer.effect(
  RdfStoreService.Tag,
  Effect.gen(function* () {
    const spaces = yield* SpaceMemories;
    const wrap = (message: string) => RdfStore.RdfStoreError.wrap({ message, ifTypeDiffers: true });

    const handlers: RdfStoreService.Handlers = {
      'RdfStoreService.query': ({ spaceId, sparql, local }) =>
        spaces.store(spaceId).pipe(
          Effect.flatMap((store) => store.query(sparql, { local })),
          Effect.map((rows) => ({ rows })),
          Effect.mapError(wrap('Query failed')),
        ),
      'RdfStoreService.write': ({ spaceId, writes, local }) =>
        spaces.store(spaceId).pipe(
          Effect.flatMap((store) => store.write(writes, { local })),
          Effect.map((id) => ({ id })),
          Effect.mapError(wrap('Write failed')),
        ),
      'RdfStoreService.export': ({ spaceId, format, prefixes }) =>
        spaces.store(spaceId).pipe(
          Effect.flatMap((store) => store.export(format, { prefixes })),
          Effect.map((data) => ({ data })),
          Effect.mapError(wrap('Export failed')),
        ),
      'RdfStoreService.import': ({ spaceId, data, format }) =>
        spaces.store(spaceId).pipe(
          Effect.flatMap((store) => store.import(data, format)),
          Effect.mapError(wrap('Import failed')),
        ),
      'RdfStoreService.changes': ({ spaceId }) =>
        Stream.unwrap(
          spaces.store(spaceId).pipe(
            Effect.map((store) =>
              Stream.callback<RdfStore.Batch>((queue) =>
                store.listen((batch) => {
                  Queue.offerUnsafe(queue, batch);
                }),
              ),
            ),
          ),
        ),
    };
    return handlers;
  }),
);
