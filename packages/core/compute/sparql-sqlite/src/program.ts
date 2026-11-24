//
// Copyright 2026 DXOS.org
//

import { type SqlStorage, type SqlStorageValue } from './sql-storage.ts';

//
// The store and engine are written once, as generators that yield the SQL statements they need and receive the
// results. A driver runs them: `runSync` against synchronous storage (a Durable Object's `ctx.storage.sql`,
// node:sqlite, wa-sqlite's sync build), and `@dxos/sparql-sqlite/async` through Effect's async `SqlClient`.
//

/** One SQL statement and how its result is wanted: rows as objects keyed by column, or as value arrays. */
export type Statement = {
  readonly sql: string;
  readonly params: readonly SqlStorageValue[];
  readonly mode: 'rows' | 'raw';
};

/** A statement's result, tagged with the mode it was asked for. */
export type Result =
  | { readonly mode: 'rows'; readonly rows: Record<string, SqlStorageValue>[] }
  | { readonly mode: 'raw'; readonly rows: SqlStorageValue[][] };

/** A computation over the store that yields statements and returns `A`. */
export type Program<A> = Generator<Statement, A, Result>;

/** Runs a statement and returns its rows as objects keyed by column. */
export function* rows(sql: string, ...params: SqlStorageValue[]): Program<Record<string, SqlStorageValue>[]> {
  const result = yield { sql, params, mode: 'rows' };
  if (result.mode !== 'rows') {
    throw new TypeError('A driver answered a rows statement with raw rows.');
  }
  return result.rows;
}

/** Runs a statement and returns its rows as value arrays, in column order. */
export function* raw(sql: string, ...params: SqlStorageValue[]): Program<SqlStorageValue[][]> {
  const result = yield { sql, params, mode: 'raw' };
  if (result.mode !== 'raw') {
    throw new TypeError('A driver answered a raw statement with object rows.');
  }
  return result.rows;
}

/** Runs a statement for its effect. */
export function* exec(sql: string, ...params: SqlStorageValue[]): Program<void> {
  yield* rows(sql, ...params);
}

/** A program that runs no statement. */
// oxlint-disable-next-line require-yield
export function* pure<A>(value: A): Program<A> {
  return value;
}

/** Runs a program against synchronous storage. */
export const runSync = <A>(storage: SqlStorage, program: Program<A>): A => {
  let step = program.next();
  while (!step.done) {
    const { sql, params, mode } = step.value;
    const cursor = storage.exec(sql, ...params);
    step = program.next(mode === 'rows' ? { mode, rows: cursor.toArray() } : { mode, rows: [...cursor.raw()] });
  }
  return step.value;
};
