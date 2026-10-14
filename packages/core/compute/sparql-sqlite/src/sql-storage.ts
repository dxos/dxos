//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

/** A value SQLite can bind or return (same set as Cloudflare's `SqlStorageValue`). */
export type SqlStorageValue = ArrayBuffer | string | number | null;

/** Result of `SqlStorage.exec`. */
export interface SqlStorageCursor {
  /** All rows as objects keyed by column name. */
  toArray(): Record<string, SqlStorageValue>[];
  /** All rows as value arrays in column order. */
  raw(): IterableIterator<SqlStorageValue[]>;
}

/**
 * The subset of a Durable Object's `ctx.storage.sql` the engine uses, so a DO's storage can be passed
 * as-is and any synchronous SQLite (node:sqlite, better-sqlite3, wa-sqlite) can be adapted to it.
 */
export interface SqlStorage {
  exec(query: string, ...bindings: SqlStorageValue[]): SqlStorageCursor;
}

/** Narrows a column value to a number. */
export const asNumber = (value: SqlStorageValue | undefined): number => {
  invariant(typeof value === 'number', 'expected a numeric column');
  return value;
};

/** Narrows a column value to a string. */
export const asString = (value: SqlStorageValue | undefined): string => {
  invariant(typeof value === 'string', 'expected a text column');
  return value;
};

/** Narrows a nullable column value to a number or null. */
export const asNullableNumber = (value: SqlStorageValue | undefined): number | null =>
  value === null || value === undefined ? null : asNumber(value);

/** Narrows a nullable column value to a string or null. */
export const asNullableString = (value: SqlStorageValue | undefined): string | null =>
  value === null || value === undefined ? null : asString(value);
