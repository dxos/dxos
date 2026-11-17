//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';

import { EchoHostService } from '@dxos/echo-host';
import * as MemoryError from '@dxos/echo-memory/MemoryError';
import type * as MemoryService from '@dxos/echo-memory/MemoryService';
import * as RdfStore from '@dxos/echo-memory/RdfStore';
import { type SpaceId } from '@dxos/keys';

import { factFeedId, factFeedLog } from './fact-feed.ts';

/** Each space's store lives in the host database under its own table prefix, apart from ECHO's tables. */
const tablePrefix = (spaceId: SpaceId): string => `rdf_${spaceId.toLowerCase()}_`;

/** A space's store, and the memory over it once something has asked for one. */
type Held = { readonly store: RdfStore.Service; memory?: MemoryService.Service };

export interface Service {
  /** The space's store, opened on first use over the host database and the space's fact feed. */
  readonly store: (spaceId: SpaceId) => Effect.Effect<RdfStore.Service, RdfStore.RdfStoreError>;
  /**
   * The space's memory, opened on first use over its store: one per space in this host, so every page and
   * operation shares one rule evaluator, one outbox per subscription and one clock.
   */
  readonly memory: (spaceId: SpaceId) => Effect.Effect<MemoryService.Service, MemoryError.MemoryError>;
}

/** The host's RDF store and memory per space, closed with the host. */
export class SpaceMemories extends Context.Service<SpaceMemories, Service>()('@dxos/client-services/SpaceMemories') {}

/**
 * Opens a space's quad store (logged to its `facts` feed) and its memory on first use. The SPARQL engine and the memory
 * core load on that first use, so they stay out of the host's (and every bundle's) boot.
 */
export const SpaceMemoriesLayer: Layer.Layer<SpaceMemories, never, EchoHostService | SqlClient.SqlClient> =
  Layer.effect(
    SpaceMemories,
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      const sql = yield* SqlClient.SqlClient;
      const scope = yield* Effect.scope;
      const lock = yield* Semaphore.make(1);
      const spaces = new Map<SpaceId, Held>();

      const held = (spaceId: SpaceId): Effect.Effect<Held, RdfStore.RdfStoreError> =>
        Effect.gen(function* () {
          const found = spaces.get(spaceId);
          if (found) {
            return found;
          }
          if (!echoHost.spaceIds.includes(spaceId)) {
            return yield* Effect.fail(new RdfStore.RdfStoreError({ message: `Unknown space: ${spaceId}` }));
          }
          const [{ QuadStore }, LocalRdfStore] = yield* Effect.promise(() =>
            Promise.all([import('@dxos/sparql-sqlite/async'), import('@dxos/echo-memory-sqlite/LocalRdfStore')]),
          );
          const log = yield* factFeedLog({ feeds: echoHost.feedStore, spaceId, feedId: factFeedId(spaceId) });
          const quads = yield* QuadStore.make({ prefix: tablePrefix(spaceId), log });
          const entry: Held = { store: LocalRdfStore.fromQuadStore(quads) };
          spaces.set(spaceId, entry);
          return entry;
        }).pipe(Effect.provideService(SqlClient.SqlClient, sql), Scope.provide(scope));

      return {
        store: (spaceId) => lock.withPermit(held(spaceId).pipe(Effect.map(({ store }) => store))),
        memory: (spaceId) =>
          lock
            .withPermit(
              Effect.gen(function* () {
                const entry = yield* held(spaceId);
                if (!entry.memory) {
                  const RdfMemory = yield* Effect.promise(() => import('@dxos/echo-memory-sqlite/RdfMemory'));
                  entry.memory = yield* RdfMemory.make(entry.store).pipe(Scope.provide(scope));
                }
                return entry.memory;
              }),
            )
            .pipe(
              Effect.mapError(
                MemoryError.MemoryError.wrap({ message: 'Failed to open the memory', ifTypeDiffers: true }),
              ),
            ),
      };
    }),
  );
