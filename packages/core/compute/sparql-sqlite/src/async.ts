//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { EngineCore, type EngineOptions } from './engine.ts';
import { InvalidSparqlError, UnsupportedSparqlError } from './errors.ts';
import { type Program, type Result } from './program.ts';
import { type SqlStorageValue } from './sql-storage.ts';
import { type IndexSet } from './store.ts';
import { type Quad, type Row } from './terms.ts';

/** Errors a query can fail with; anything else a program throws is a defect. */
export type SparqlError = InvalidSparqlError | UnsupportedSparqlError;

/** A value from an async driver in the shape the store reads: blobs as `ArrayBuffer`, 64-bit integers as numbers. */
const toStorageValue = (value: unknown): SqlStorageValue => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value instanceof Uint8Array) {
    // Copied, since the driver's buffer may be shared or reused for the next row.
    const copy = new ArrayBuffer(value.byteLength);
    new Uint8Array(copy).set(value);
    return copy;
  }
  if (value instanceof ArrayBuffer) {
    return value;
  }
  throw new TypeError(`Unexpected SQLite value: ${typeof value}`);
};

/** Advances a program; a SPARQL error it throws becomes a failure, anything else a defect. */
const step = <A>(program: Program<A>, result?: Result) =>
  Effect.suspend(() => {
    try {
      return Effect.succeed(result === undefined ? program.next() : program.next(result));
    } catch (error) {
      return error instanceof UnsupportedSparqlError || error instanceof InvalidSparqlError
        ? Effect.fail(error)
        : Effect.die(error);
    }
  });

/**
 * Runs a program through Effect's async `SqlClient`: each statement it yields is one round trip. Run it inside
 * `sql.withTransaction` to make its writes atomic.
 */
export const runEffect = <A>(
  program: Program<A>,
): Effect.Effect<A, SqlError.SqlError | SparqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    let next = yield* step(program);
    while (!next.done) {
      const { sql: text, params, mode } = next.value;
      const statement = sql.unsafe<Record<string, unknown>>(text, params);
      const result: Result =
        mode === 'rows'
          ? {
              mode,
              rows: (yield* statement).map((row) =>
                Object.fromEntries(Object.entries(row).map(([column, value]) => [column, toStorageValue(value)])),
              ),
            }
          : { mode, rows: (yield* statement.values).map((values) => values.map(toStorageValue)) };
      next = yield* step(program, result);
    }
    return next.value;
  });

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
