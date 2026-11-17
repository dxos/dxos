//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';
import * as Stream from 'effect/Stream';

import { EchoHostService } from '@dxos/echo-host';
import { RdfStore } from '@dxos/echo-memory';
import { type SpaceId } from '@dxos/keys';
import { RdfStoreService } from '@dxos/protocols/rpc';
import type { QuadStore } from '@dxos/sparql-sqlite/async';

import { factFeedId, factFeedLog } from './fact-feed.ts';

/** Each space's store lives in the host database under its own table prefix, apart from ECHO's tables. */
const tablePrefix = (spaceId: SpaceId): string => `rdf_${spaceId.toLowerCase()}_`;

/** Drops the variables a solution leaves unbound, which the engine reports as `undefined`. */
const bound = (row: Readonly<Record<string, RdfStore.Quad['s'] | undefined>>) =>
  Object.fromEntries(Object.entries(row).flatMap(([name, term]) => (term ? [[name, term]] : [])));

/**
 * Serves `RdfStoreService` RPCs: one `@dxos/sparql-sqlite` quad store per space, opened on its first call over the
 * host's own SQLite database and logged to the space's `facts` feed, and closed with this layer. The host runs SPARQL
 * and applies batches; a memory over the store runs beside the caller.
 */
export const RdfHostLayer: Layer.Layer<RdfStoreService.Tag, never, EchoHostService | SqlClient.SqlClient> =
  Layer.effect(
    RdfStoreService.Tag,
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      const sql = yield* SqlClient.SqlClient;
      const scope = yield* Effect.scope;
      const lock = yield* Semaphore.make(1);
      const stores = new Map<SpaceId, QuadStore.QuadStore>();

      const storeFor = (spaceId: SpaceId): Effect.Effect<QuadStore.QuadStore, RdfStore.RdfStoreError> =>
        lock.withPermit(
          Effect.gen(function* () {
            const held = stores.get(spaceId);
            if (held) {
              return held;
            }
            if (!echoHost.spaceIds.includes(spaceId)) {
              return yield* Effect.fail(new RdfStore.RdfStoreError({ message: `Unknown space: ${spaceId}` }));
            }
            // Loaded on first use: the SPARQL engine stays out of the host's (and every bundle's) boot.
            const { QuadStore } = yield* Effect.promise(() => import('@dxos/sparql-sqlite/async'));
            const log = yield* factFeedLog({ feeds: echoHost.feedStore, spaceId, feedId: factFeedId(spaceId) });
            const store = yield* QuadStore.make({ prefix: tablePrefix(spaceId), log });
            stores.set(spaceId, store);
            return store;
          }).pipe(Effect.provideService(SqlClient.SqlClient, sql), Scope.provide(scope)),
        );

      const wrap = (message: string) => RdfStore.RdfStoreError.wrap({ message, ifTypeDiffers: true });

      /** The serializers load only when an import or export runs, since the text format needs a parser no query does. */
      const exchange = Effect.promise(() => import('@dxos/sparql-sqlite/exchange'));

      const handlers: RdfStoreService.Handlers = {
        'RdfStoreService.query': ({ spaceId, sparql, local }) =>
          storeFor(spaceId).pipe(
            Effect.flatMap((store) => store.query(sparql, { local })),
            Effect.map((rows) => ({ rows: rows.map(bound) })),
            Effect.mapError(wrap('Query failed')),
          ),

        'RdfStoreService.write': ({ spaceId, writes, local }) =>
          storeFor(spaceId).pipe(
            Effect.flatMap((store) => store.write(writes, { local })),
            Effect.map((id) => ({ id })),
            Effect.mapError(wrap('Write failed')),
          ),

        // Serialized here, beside the store, so a large store crosses to the caller once and in its compact form.
        'RdfStoreService.export': ({ spaceId, format }) =>
          Effect.gen(function* () {
            const store = yield* storeFor(spaceId);
            const quads = yield* store.quads();
            const { encode } = yield* exchange;
            return { data: yield* Effect.try(() => encode(quads, format)) };
          }).pipe(Effect.mapError(wrap('Export failed'))),

        'RdfStoreService.import': ({ spaceId, data, format }) =>
          Effect.gen(function* () {
            const store = yield* storeFor(spaceId);
            const { decode } = yield* exchange;
            const quads = yield* Effect.try(() => decode(data, format));
            return { id: yield* store.write([{ _tag: 'insert', quads }]) };
          }).pipe(Effect.mapError(wrap('Import failed'))),

        'RdfStoreService.changes': ({ spaceId }) =>
          Stream.unwrap(
            storeFor(spaceId).pipe(
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
