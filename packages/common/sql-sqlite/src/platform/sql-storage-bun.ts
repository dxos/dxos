//
// Copyright 2026 DXOS.org
//

import { Database as BunDatabase } from 'bun:sqlite';
import * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/sql/SqlError';

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

const open = (path: string): Database => {
  const db = new BunDatabase(path);
  return {
    exec: (query, ...bindings) => {
      const statement = db.prepare(query);
      try {
        // `values()` answers null, not [], for a statement with no result columns.
        const rows = (statement.values(...bindings.map(toBinding)) ?? []).map((row): Value[] => row.map(toValue));
        return makeCursor(statement.columnNames, rows);
      } finally {
        statement.finalize();
      }
    },
    transactionSync: makeTransactionSync((sql) => db.exec(sql)),
    close: () => db.close(),
  };
};

/** Opens a {@link Database} over a SQLite file (`bun:sqlite`). */
export const makeFile = (path: string): Effect.Effect<Database, SqlError.SqlError> =>
  Effect.try({ try: () => open(path), catch: (cause) => openError(cause, `Failed to open ${path}`) });

/** Opens a {@link Database} over a fresh in-memory SQLite database (`bun:sqlite`). */
export const makeMemory = (): Effect.Effect<Database, SqlError.SqlError> => makeFile(':memory:');
