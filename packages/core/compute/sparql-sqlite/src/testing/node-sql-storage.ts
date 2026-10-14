//
// Copyright 2026 DXOS.org
//

import { DatabaseSync } from 'node:sqlite';

import { type SqlStorage, type SqlStorageValue } from '../sql-storage.ts';

const toValue = (value: unknown): SqlStorageValue => {
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

const toRecord = (row: unknown): Record<string, SqlStorageValue> => {
  if (typeof row !== 'object' || row === null) {
    throw new TypeError('expected a row object');
  }
  return Object.fromEntries(Object.entries(row).map(([name, value]) => [name, toValue(value)]));
};

const toBinding = (value: SqlStorageValue): string | number | null | Uint8Array =>
  value instanceof ArrayBuffer ? new Uint8Array(value) : value;

/** `SqlStorage` over an in-memory (or file) `node:sqlite` database, mirroring DO `ctx.storage.sql`. */
export const createNodeSqlStorage = (path = ':memory:'): SqlStorage & { db: DatabaseSync } => {
  const db = new DatabaseSync(path);
  return {
    db,
    exec: (query, ...bindings) => {
      const rows = db
        .prepare(query)
        .all(...bindings.map(toBinding))
        .map(toRecord);
      return {
        toArray: () => rows,
        // Column names are unique in every statement the engine emits, so object order is column order.
        raw: () => rows.map((row) => Object.values(row))[Symbol.iterator](),
      };
    },
  };
};
