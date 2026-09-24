//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';

import { log } from '@dxos/log';

type Sqlite3 = ReturnType<typeof WaSqlite.Factory>;

const STORAGE_CLASSES: Record<number, string> = {
  [WaSqlite.SQLITE_INTEGER]: 'integer',
  [WaSqlite.SQLITE_FLOAT]: 'real',
  [WaSqlite.SQLITE_TEXT]: 'text',
  [WaSqlite.SQLITE_BLOB]: 'blob',
  [WaSqlite.SQLITE_NULL]: 'null',
};

/** What a failed row decode knew about one column of the current row. */
export type ColumnDiagnostic = {
  readonly index: number;
  readonly name: string | undefined;
  readonly storageClass: string;
  readonly bytes: number;
  readonly decodes: boolean;
};

const attempt = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

/**
 * Describes every column of the row `stmt` is positioned on, re-reading each one on its own so a
 * decode failure names the column and storage class that raised it rather than just the statement.
 */
export const describeColumns = (sqlite3: Sqlite3, stmt: number): Array<ColumnDiagnostic> =>
  Array.from({ length: sqlite3.column_count(stmt) }, (_, index) => {
    const type = sqlite3.column_type(stmt, index);
    return {
      index,
      // The name goes through the same string decoder as TEXT values, so it can fail alongside them.
      name: attempt(() => sqlite3.column_name(stmt, index)),
      storageClass: STORAGE_CLASSES[type] ?? String(type),
      bytes: sqlite3.column_bytes(stmt, index),
      decodes:
        attempt(() => {
          sqlite3.column(stmt, index);
          return true;
        }) ?? false,
    };
  });

/**
 * Reads the column names (unless already known) and values of the row `stmt` is positioned on,
 * logging per-column diagnostics before rethrowing when either fails to decode.
 */
export const readRow = (
  sqlite3: Sqlite3,
  stmt: number,
  sql: string,
  columns: Array<string> | undefined,
): { columns: Array<string>; row: Array<unknown> } => {
  try {
    const names = columns ?? sqlite3.column_names(stmt);
    return { columns: names, row: sqlite3.row(stmt) };
  } catch (error) {
    log.warn('sqlite row decode failed', {
      error,
      sql: sql.replace(/\s+/g, ' ').trim(),
      columns: describeColumns(sqlite3, stmt),
    });
    throw error;
  }
};
