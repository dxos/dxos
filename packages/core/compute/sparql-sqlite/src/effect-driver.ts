//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { InvalidSparqlError, UnsupportedSparqlError } from './errors.ts';
import { type Program, type Result } from './program.ts';
import { type SqlStorageValue } from './sql-storage.ts';

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

const sparqlError = (error: unknown): SparqlError | undefined =>
  error instanceof UnsupportedSparqlError || error instanceof InvalidSparqlError ? error : undefined;

/** Advances a program; what it throws becomes a failure when `toFailure` maps it, else a defect. */
const step = <A, E>(program: Program<A>, toFailure: (error: unknown) => E | undefined, result?: Result) =>
  Effect.try({
    try: () => (result === undefined ? program.next() : program.next(result)),
    catch: (error) => ({ error, failure: toFailure(error) }),
  }).pipe(Effect.catch(({ error, failure }) => (failure === undefined ? Effect.die(error) : Effect.fail(failure))));

/**
 * Runs a program through Effect's async `SqlClient`: each statement it yields is one round trip. Run it inside
 * `sql.withTransaction` to make its writes atomic.
 */
export const runEffect: {
  <A>(program: Program<A>): Effect.Effect<A, SqlError.SqlError | SparqlError, SqlClient.SqlClient>;
  /** With `toFailure`, an error the program throws fails the effect when it maps to a value, else is a defect. */
  <A, E>(
    program: Program<A>,
    toFailure: (error: unknown) => E | undefined,
  ): Effect.Effect<A, SqlError.SqlError | E, SqlClient.SqlClient>;
} = <A, E>(
  program: Program<A>,
  toFailure: (error: unknown) => E | SparqlError | undefined = sparqlError,
): Effect.Effect<A, SqlError.SqlError | E | SparqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    let next = yield* step(program, toFailure);
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
      next = yield* step(program, toFailure, result);
    }
    return next.value;
  });
