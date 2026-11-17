//
// Copyright 2026 DXOS.org
//

import type * as WaSqlite from '@effect/wa-sqlite';

type Sqlite3 = ReturnType<typeof WaSqlite.Factory>;

/** Prepared statements kept per connection; a client's working set is a few dozen. */
const STATEMENT_CACHE_SIZE = 256;

export type StatementCache = {
  /**
   * Runs `execute` on each statement of `sql` in order, reusing the prepared statement of a
   * single-statement string from an earlier call.
   */
  forEach: (sql: string, execute: (stmt: number) => void) => void;
  /** Finalizes every cached statement, as closing or replacing the database requires. */
  clear: () => void;
};

/**
 * Prepared statements by SQL text, since a client sends the same few statements thousands of times and
 * preparing one costs more than running it.
 */
export const makeStatementCache = (sqlite3: Sqlite3, db: number, size = STATEMENT_CACHE_SIZE): StatementCache => {
  const cache = new Map<string, number>();

  const clear = () => {
    for (const stmt of cache.values()) {
      sqlite3.finalize(stmt);
    }
    cache.clear();
  };

  const runCached = (sql: string, stmt: number, execute: (stmt: number) => void) => {
    // Most recently used last, so eviction takes the oldest.
    cache.delete(sql);
    cache.set(sql, stmt);
    try {
      execute(stmt);
    } finally {
      try {
        sqlite3.reset(stmt);
        sqlite3.clear_bindings(stmt);
      } catch {
        // Reset reports the last step's error; a statement that cannot be readied is dropped.
        cache.delete(sql);
        sqlite3.finalize(stmt);
      }
    }
  };

  const forEach = (sql: string, execute: (stmt: number) => void) => {
    const cached = cache.get(sql);
    if (cached !== undefined) {
      runCached(sql, cached, execute);
      return;
    }

    // Prepared one at a time: a later statement of a script can depend on an earlier one's schema change.
    let first: number | undefined;
    let count = 0;
    try {
      for (const stmt of sqlite3.statements(db, sql, { unscoped: true })) {
        count++;
        if (count === 1) {
          first = stmt;
          execute(stmt);
          continue;
        }
        // A script: nothing of it is kept.
        if (first !== undefined) {
          sqlite3.finalize(first);
          first = undefined;
        }
        try {
          execute(stmt);
        } finally {
          sqlite3.finalize(stmt);
        }
      }
    } catch (err) {
      if (first !== undefined) {
        sqlite3.finalize(first);
      }
      throw err;
    }

    if (first !== undefined) {
      sqlite3.reset(first);
      sqlite3.clear_bindings(first);
      cache.set(sql, first);
      if (cache.size > size) {
        for (const [oldestSql, oldest] of cache) {
          cache.delete(oldestSql);
          sqlite3.finalize(oldest);
          break;
        }
      }
    }
  };

  return { forEach, clear };
};
