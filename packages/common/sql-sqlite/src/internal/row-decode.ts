//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Raised when reading one column of a stepped row throws, so the failure names the column rather
 * than surfacing the bare `RangeError: Bad value` the wasm/`TextDecoder` boundary produces (DX-1298).
 */
export const SqliteDecodeError = BaseError.extend('SQLITE_DECODE_ERROR', 'Failed to decode SQLite column');

/** The wa-sqlite surface the decoder needs, so it can be exercised without instantiating wasm. */
export interface ColumnReader {
  data_count(stmt: number): number;
  column_name(stmt: number, index: number): string;
  column_type(stmt: number, index: number): number;
  column_bytes(stmt: number, index: number): number;
  column(stmt: number, index: number): unknown;
}

/** SQLite's `SQLITE_*` datatype codes, as returned by `sqlite3_column_type`. */
const SQLITE_TYPE_NAMES: Record<number, string> = {
  1: 'INTEGER',
  2: 'FLOAT',
  3: 'TEXT',
  4: 'BLOB',
  5: 'NULL',
};

const UNAVAILABLE = '<unavailable>';

const MAX_REPORTED_SQL_LENGTH = 256;

/** Probing a failed column can itself throw, and a broken diagnostic must not replace the real error. */
const attempt = <T>(fn: () => T): T | string => {
  try {
    return fn();
  } catch {
    return UNAVAILABLE;
  }
};

const summarizeSql = (sql: string): string => {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  return normalized.length > MAX_REPORTED_SQL_LENGTH
    ? `${normalized.slice(0, MAX_REPORTED_SQL_LENGTH)}…(${normalized.length} chars)`
    : normalized;
};

/**
 * Describes the column without reading its contents: the stored bytes are user data and must not
 * reach a log, so only their declared type and length are reported.
 */
const describeColumn = (sqlite3: ColumnReader, stmt: number, index: number, sql: string): Record<string, unknown> => ({
  column: attempt(() => sqlite3.column_name(stmt, index)),
  columnIndex: index,
  sqliteType: attempt(() => SQLITE_TYPE_NAMES[sqlite3.column_type(stmt, index)] ?? UNAVAILABLE),
  byteLength: attempt(() => sqlite3.column_bytes(stmt, index)),
  sql: summarizeSql(sql),
});

const decodeColumn = (sqlite3: ColumnReader, stmt: number, index: number, sql: string): unknown => {
  let value: unknown;
  try {
    value = sqlite3.column(stmt, index);
  } catch (cause) {
    throw new SqliteDecodeError({ cause, context: describeColumn(sqlite3, stmt, index, sql) });
  }

  // Blobs alias volatile wasm memory, so they are invalid after the next SQLite call.
  return value instanceof Uint8Array ? value.slice() : value;
};

/** Reads one stepped row, replacing `sqlite3.row` so a column that fails to decode is identified. */
export const decodeRow = (sqlite3: ColumnReader, stmt: number, sql: string): unknown[] => {
  const count = sqlite3.data_count(stmt);
  const row: unknown[] = new Array(count);
  for (let index = 0; index < count; index++) {
    row[index] = decodeColumn(sqlite3, stmt, index, sql);
  }
  return row;
};
