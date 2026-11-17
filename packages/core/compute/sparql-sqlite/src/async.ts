//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type SparqlError, runEffect } from './effect-driver.ts';
import { EngineCore, type EngineOptions } from './engine.ts';
import { type Program } from './program.ts';
import { type IndexSet } from './store.ts';
import { type Quad, type Row } from './terms.ts';

/**
 * SPARQL 1.1 engine over an async SQLite connection (Effect's `SqlClient`): the same compiler, store and answers
 * as `SqlSparqlEngine`, with each statement a round trip. Operations run one at a time, since the engine's plan and
 * term caches describe the store between them; wrap writes in `sql.withTransaction` for atomicity.
 */
export class SqlSparqlEngineAsync {
  readonly core: EngineCore;
  readonly #lock = Semaphore.makeUnsafe(1);

  constructor(options: EngineOptions = {}) {
    this.core = new EngineCore(options);
  }

  #run<A>(program: () => Program<A>): Effect.Effect<A, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#lock.withPermit(Effect.suspend(() => runEffect(program())));
  }

  /** Creates the schema if missing; run once before use. */
  init(): Effect.Effect<void, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.init());
  }

  /** Drops all data (optionally switching the index set). */
  reset(indexes?: IndexSet): Effect.Effect<void, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.reset(indexes));
  }

  /** Inserts quads in one set-oriented batch. */
  insert(quads: readonly Quad[]): Effect.Effect<void, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.insert(quads));
  }

  /** Number of stored quads. */
  count(): Effect.Effect<number, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.count());
  }

  /** Runs a SPARQL query or update; see `SqlSparqlEngine.query`. */
  query(sparql: string): Effect.Effect<Row[], SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.query(sparql));
  }

  /** Compiled SQL and SQLite's EXPLAIN QUERY PLAN for a query. */
  explain(
    sparql: string,
  ): Effect.Effect<{ sql: string; plan: string[] }, SqlError.SqlError | SparqlError, SqlClient.SqlClient> {
    return this.#run(() => this.core.explain(sparql));
  }
}

export { type SparqlError, runEffect } from './effect-driver.ts';
export * as QuadStore from './quad-store.ts';
