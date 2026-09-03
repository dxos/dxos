//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/** Log context is truncated at a fixed length; oversized params (blobs, long strings) must not push `time` out of it. */
const MAX_LOGGED_PARAM_STRING_LENGTH = 64;

/**
 * Queries at or above this duration are logged at DEBUG; the rest at TRACE.
 *
 * The persistent log store drops TRACE, so a per-query DEBUG line accumulates in the
 * feedback bundle: in DX-1250 it was 80% of a 50 MB upload and collapsed the retained
 * window to under nine minutes, evicting the failure the report was about. Slow queries
 * are the only ones worth that budget.
 */
export const SLOW_QUERY_THRESHOLD_MS = 20;

const summarizeLoggedParam = (value: unknown): unknown => {
  if (typeof value === 'string' && value.length > MAX_LOGGED_PARAM_STRING_LENGTH) {
    return `${value.slice(0, MAX_LOGGED_PARAM_STRING_LENGTH)}…(${value.length} chars)`;
  }
  if (value instanceof Uint8Array) {
    return `<Uint8Array ${value.length} bytes>`;
  }
  if (value instanceof ArrayBuffer) {
    return `<ArrayBuffer ${value.byteLength} bytes>`;
  }
  if (Array.isArray(value) && value.length > MAX_LOGGED_PARAM_STRING_LENGTH) {
    return `<Array ${value.length} items>`;
  }
  return value;
};

export const summarizeLoggedParams = (params: ReadonlyArray<unknown>): ReadonlyArray<unknown> =>
  params.map(summarizeLoggedParam);

export type SqliteQueryLogEntry = {
  sql: string;
  params: ReadonlyArray<unknown>;
  results: number;
  /** Wall-clock duration of the query, in milliseconds. */
  time: number;
};

/**
 * Emit one `sqlite query` line, at DEBUG when the query was slow and at TRACE otherwise
 * (see {@link SLOW_QUERY_THRESHOLD_MS}). Raise the level for a local session with
 * `DX_LOG=trace` or a per-file filter.
 */
export const logSqliteQuery = ({ sql, params, results, time }: SqliteQueryLogEntry): void => {
  const context = {
    sql: sql.replace(/\s+/g, ' ').trim(),
    params: summarizeLoggedParams(params),
    results,
    time,
  };

  if (time >= SLOW_QUERY_THRESHOLD_MS) {
    log('sqlite query', context);
  } else {
    log.trace('sqlite query', context);
  }
};
