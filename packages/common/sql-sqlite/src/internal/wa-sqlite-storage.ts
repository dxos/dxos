//
// Copyright 2026 DXOS.org
//

import type * as WaSqlite from '@effect/wa-sqlite';

import { type Database, type Value, makeCursor, makeTransactionSync, toBinding, toValue } from './sql-storage.ts';

export type Sqlite3 = ReturnType<typeof WaSqlite.Factory>;

/** Opens an in-memory {@link Database} on an instantiated synchronous wa-sqlite build. */
export const openMemory = (sqlite3: Sqlite3, sqliteRow: number): Database => {
  const db = sqlite3.open_v2(':memory:');
  const run = (query: string, bindings: readonly Value[]) => {
    let columns: string[] = [];
    const rows: Value[][] = [];
    for (const stmt of sqlite3.statements(db, query)) {
      if (bindings.length > 0) {
        sqlite3.bind_collection(stmt, bindings.map(toBinding));
      }
      while (sqlite3.step(stmt) === sqliteRow) {
        if (rows.length === 0) {
          columns = sqlite3.column_names(stmt);
        }
        rows.push(sqlite3.row(stmt).map(toValue));
      }
    }
    return makeCursor(columns, rows);
  };
  return {
    exec: (query, ...bindings) => run(query, bindings),
    transactionSync: makeTransactionSync((sql) => void run(sql, [])),
    close: () => void sqlite3.close(db),
  };
};
