//
// Copyright 2026 DXOS.org
//

import * as SqlError from 'effect/sql/SqlError';

/** A value SQLite binds or returns (Cloudflare's `SqlStorageValue`). */
export type Value = ArrayBuffer | string | number | null;

/** Result of {@link Storage.exec}. */
export interface Cursor {
  /** All rows as objects keyed by column name. */
  toArray(): Record<string, Value>[];
  /** All rows as value arrays in column order. */
  raw(): IterableIterator<Value[]>;
}

/** Synchronous SQL in the shape of a Durable Object's `ctx.storage.sql`, so either can back the same code. */
export interface Storage {
  exec(query: string, ...bindings: Value[]): Cursor;
}

/** A {@link Storage} over a database this process opened. */
export interface Database extends Storage {
  /** Runs `fn` atomically, like a Durable Object's `ctx.storage.transactionSync`; calls nest. */
  transactionSync<T>(fn: () => T): T;
  close(): void;
}

export const toValue = (value: unknown): Value => {
  if (value === null || typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (value instanceof Uint8Array) {
    const copy = new ArrayBuffer(value.byteLength);
    new Uint8Array(copy).set(value);
    return copy;
  }
  throw new TypeError(`unexpected SQLite value: ${typeof value}`);
};

export const toBinding = (value: Value): string | number | null | Uint8Array =>
  value instanceof ArrayBuffer ? new Uint8Array(value) : value;

/** A cursor over rows read in full (column names are unique in every statement callers rely on). */
export const makeCursor = (columns: readonly string[], rows: readonly Value[][]): Cursor => ({
  toArray: () => rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]]))),
  raw: () => rows[Symbol.iterator](),
});

/** Savepoint-based `transactionSync`, so a transaction opened inside another one nests. */
export const makeTransactionSync = (exec: (sql: string) => void): Database['transactionSync'] => {
  let depth = 0;
  return (fn) => {
    const savepoint = `tx${depth++}`;
    exec(`SAVEPOINT ${savepoint}`);
    try {
      const result = fn();
      exec(`RELEASE ${savepoint}`);
      return result;
    } catch (error) {
      exec(`ROLLBACK TO ${savepoint}`);
      exec(`RELEASE ${savepoint}`);
      throw error;
    } finally {
      depth--;
    }
  };
};

export const openError = (cause: unknown, message: string): SqlError.SqlError =>
  new SqlError.SqlError({ reason: new SqlError.UnknownError({ cause, message, operation: 'open' }) });
