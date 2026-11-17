//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/sql/SqlClient';

import { RdfStore } from '@dxos/echo-memory';
import { QuadStore } from '@dxos/sparql-sqlite/async';

/** Drops the variables a solution leaves unbound, which the engine reports as `undefined`. */
const bound = (row: Readonly<Record<string, RdfStore.Quad['s'] | undefined>>) =>
  Object.fromEntries(Object.entries(row).flatMap(([name, term]) => (term ? [[name, term]] : [])));

/** The serializers load only when an import or export runs, since the text format needs a parser no query does. */
const exchange = Effect.promise(() => import('@dxos/sparql-sqlite/exchange'));

/**
 * The RdfStore port over an open `@dxos/sparql-sqlite` quad store, for a memory in the same process as the store: the
 * CLI's, a test's, or the client services host's.
 */
export const fromQuadStore = (store: QuadStore.QuadStore): RdfStore.Service => {
  const wrap = (message: string) => (cause: unknown) => new RdfStore.RdfStoreError({ message, cause });

  const service: RdfStore.Service = {
    query: (sparql, queryOptions) =>
      store.query(sparql, queryOptions).pipe(
        Effect.map((rows) => rows.map(bound)),
        Effect.mapError(wrap('Query failed')),
      ),

    write: (writes, writeOptions) => store.write(writes, writeOptions).pipe(Effect.mapError(wrap('Write failed'))),

    export: (format) =>
      Effect.gen(function* () {
        const quads = yield* store.quads();
        const { encode } = yield* exchange;
        return yield* Effect.try(() => encode(quads, format));
      }).pipe(Effect.mapError(wrap('Export failed'))),

    import: (data, format) =>
      Effect.gen(function* () {
        const { decode } = yield* exchange;
        const quads = yield* Effect.try(() => decode(data, format));
        return yield* store.write([{ _tag: 'insert', quads }]);
      }).pipe(Effect.mapError(wrap('Import failed'))),

    listen: (onApplied) => store.listen(onApplied),
  };
  return service;
};

/** {@link fromQuadStore} over a new quad store on the async `SqlClient` in context. */
export const make = (
  options: QuadStore.Options = {},
): Effect.Effect<RdfStore.Service, never, SqlClient.SqlClient | Scope.Scope> =>
  QuadStore.make(options).pipe(Effect.map(fromQuadStore));

/** Layer of {@link make}. */
export const layer = (options?: QuadStore.Options): Layer.Layer<RdfStore.RdfStore, never, SqlClient.SqlClient> =>
  Layer.effect(RdfStore.RdfStore, make(options));
