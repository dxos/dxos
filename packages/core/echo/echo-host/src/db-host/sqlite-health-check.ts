//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { asyncTimeout } from '@dxos/async';
import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

/**
 * Executes "PRAGMA quick_check;" on SQLite database on startup.
 *
 * NOTE: Keep DISABLED in production, "quick" check is O(dbSize) which took 6 seconds for my relatively-small profile.
 */
export const RUN_SQLITE_QUICK_CHECK_ON_STARTUP = false;

/** Timeout for the startup sqlite health check (schema probe + optional quick_check). */
export const SQLITE_HEALTH_CHECK_TIMEOUT_MS = 15_000;

/**
 * Sqlite health check on startup.
 *
 * Always runs a cheap schema-level probe (`PRAGMA schema_version` + a read from
 * `sqlite_schema`). These do not walk user data, but they fail fast if the DB
 * file header or schema root page is unreadable.
 *
 * Additionally runs `PRAGMA quick_check` when {@link RUN_SQLITE_QUICK_CHECK_ON_STARTUP}
 * is enabled. That walks every page and is O(dbSize) — slow on OPFS.
 */
export const testSqlite = (): Effect.Effect<void, unknown, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    log('begin sqlite health check');
    const sql = yield* SqlClient.SqlClient;
    const databases = yield* sql<{ seq: number; name: string; file: string }>`PRAGMA database_list`;
    log('SQLite databases', { databases });

    // Cheap header/schema probe: forces SQLite to read the file header and
    // schema root page. Catches catastrophic corruption (bad header,
    // unreadable schema) without walking user data.
    const [schemaVersion] = yield* sql<{ schema_version: number }>`PRAGMA schema_version`;
    const [schemaCount] = yield* sql<{ n: number }>`SELECT count(*) AS n FROM sqlite_schema`;
    log('sqlite schema probe passed', {
      schemaVersion: schemaVersion.schema_version,
      objectCount: schemaCount.n,
    });

    if (RUN_SQLITE_QUICK_CHECK_ON_STARTUP) {
      // NOTE: This is slow on non-trivial databases: O(dbSize).
      log('starting sqlite quick_check');
      const [result] = yield* sql<{ quick_check: string }>`PRAGMA quick_check`;
      if (result.quick_check !== 'ok') {
        throw new Error('SQLite quick check failed');
      }
      log('sqlite quick_check passed');
    } else {
      log('sqlite quick_check skipped');
    }
    log('sqlite health check complete');
  });

/**
 * Run {@link testSqlite} via the service runtime before hypercore feed storage opens.
 * Timeout is outside the Effect runtime to catch the layer hanging on startup.
 */
export const runSqliteHealthCheck = async (
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransaction.SqlTransaction>,
  options?: { timeoutMs?: number },
): Promise<void> => {
  const timeoutMs = options?.timeoutMs ?? SQLITE_HEALTH_CHECK_TIMEOUT_MS;
  await asyncTimeout(
    RuntimeProvider.runPromise(runtime)(testSqlite()),
    timeoutMs,
    new Error('SQLite health check timed out'),
  );
};
