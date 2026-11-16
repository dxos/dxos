//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';

import { EchoHostService } from '@dxos/echo-host';
import { type MemoryService as Memory, MemoryError, MemoryQuery } from '@dxos/echo-memory';
import { EntityId, type SpaceId } from '@dxos/keys';
import { MemoryService } from '@dxos/protocols/rpc';

/** Seed of the id of a space's fact feed, which every device derives the same way so the feed replicates as one. */
const FACT_FEED_SEED = 'org.dxos.memory.facts';

/** The id of a space's feed in the `facts` namespace. */
export const factFeedId = (spaceId: SpaceId): EntityId => EntityId.deterministic(FACT_FEED_SEED, spaceId);

/** Each space's memory lives in the host database under its own table prefix, apart from ECHO's tables. */
const tablePrefix = (spaceId: SpaceId): string => `memory_${spaceId.toLowerCase()}_`;

/**
 * Serves `MemoryService` RPCs: one `@dxos/echo-memory-sqlite` memory per space, opened on its first call over the
 * host's own SQLite database and a fact log in the space's `facts` feed, and closed with this layer.
 */
export const MemoryHostLayer: Layer.Layer<MemoryService.Tag, never, EchoHostService | SqlClient.SqlClient> =
  Layer.effect(
    MemoryService.Tag,
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      const sql = yield* SqlClient.SqlClient;
      const scope = yield* Effect.scope;
      const lock = yield* Semaphore.make(1);
      const memories = new Map<SpaceId, Memory.Service>();

      const memoryFor = (spaceId: SpaceId): Effect.Effect<Memory.Service, MemoryError.MemoryError> =>
        lock.withPermit(
          Effect.gen(function* () {
            const held = memories.get(spaceId);
            if (held) {
              return held;
            }
            if (!echoHost.spaceIds.includes(spaceId)) {
              return yield* Effect.fail(new MemoryError.MemoryError({ message: `Unknown space: ${spaceId}` }));
            }
            // Loaded on first use: the SPARQL store and its RDF libraries stay out of the host's (and every bundle's) boot.
            const { FactLog, MemorySqlite } = yield* Effect.promise(() => import('@dxos/echo-memory-sqlite'));
            const log = yield* FactLog.feed({ feeds: echoHost.feedStore, spaceId, feedId: factFeedId(spaceId) });
            const memory = yield* MemorySqlite.makeAsync({ log, prefix: tablePrefix(spaceId) });
            memories.set(spaceId, memory);
            return memory;
          }).pipe(Effect.provideService(SqlClient.SqlClient, sql), Scope.provide(scope)),
        );

      const encodeResult = (query: MemoryQuery.Any) => Schema.encodeUnknownEffect(MemoryQuery.resultOf(query));

      const handlers: MemoryService.Handlers = {
        'MemoryService.put': ({ spaceId, facts, options }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.put(facts, options)),
            Effect.map((queued) => ({ queued })),
          ),
        'MemoryService.query': ({ spaceId, query }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.query(query)),
            Effect.flatMap(encodeResult(query)),
            Effect.map((result) => ({ result })),
            Effect.mapError(
              MemoryError.MemoryError.wrap({ message: 'Failed to answer the query', ifTypeDiffers: true }),
            ),
          ),
        'MemoryService.reset': ({ spaceId }) => memoryFor(spaceId).pipe(Effect.flatMap((memory) => memory.reset())),
        'MemoryService.subscribe': ({ spaceId, subscription }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.subscribe(subscription)),
            Effect.map((added) => ({ added })),
          ),
        'MemoryService.subscriptions': ({ spaceId, owner }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.subscriptions(owner)),
            Effect.map((subscriptions) => ({ subscriptions })),
          ),
        'MemoryService.unsubscribe': ({ spaceId, id }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.unsubscribe(id)),
            Effect.map((removed) => ({ removed })),
          ),
        'MemoryService.take': ({ spaceId, id }) =>
          memoryFor(spaceId).pipe(
            Effect.flatMap((memory) => memory.take(id)),
            Effect.map((events) => ({ events })),
          ),
        'MemoryService.ack': ({ spaceId, id, events }) =>
          memoryFor(spaceId).pipe(Effect.flatMap((memory) => memory.ack(id, events))),
      };
      return handlers;
    }),
  );
