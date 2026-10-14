//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/sql/SqlError';
import { DatabaseSync } from 'node:sqlite';

import {
  type Database,
  type Value,
  makeCursor,
  makeTransactionSync,
  openError,
  toBinding,
  toValue,
} from '../internal/sql-storage.ts';

export type { Cursor, Database, Storage, Value } from '../internal/sql-storage.ts';

const asRecord = (row: unknown): object => {
  if (typeof row !== 'object' || row === null) {
    throw new TypeError('expected a row object');
  }
  return row;
};

const open = (path: string): Database => {
  const db = new DatabaseSync(path);
  return {
    exec: (query, ...bindings) => {
      const records = db
        .prepare(query)
        .all(...bindings.map(toBinding))
        .map(asRecord);
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const rows = records.map((record): Value[] => Object.values(record).map(toValue));
      return makeCursor(columns, rows);
    },
    transactionSync: makeTransactionSync((sql) => db.exec(sql)),
    close: () => db.close(),
  };
};

/** Opens a {@link Database} over a SQLite file (`node:sqlite`). */
export const makeFile = (path: string): Effect.Effect<Database, SqlError.SqlError> =>
  Effect.try({ try: () => open(path), catch: (cause) => openError(cause, `Failed to open ${path}`) });

/** Opens a {@link Database} over a fresh in-memory SQLite database (`node:sqlite`). */
export const makeMemory = (): Effect.Effect<Database, SqlError.SqlError> => makeFile(':memory:');
