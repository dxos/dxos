//
// Copyright 2026 DXOS.org
//

import { type Subduction } from '@automerge/automerge-subduction';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';

import { type SqliteStorageAdapter } from '../sqlite-storage-adapter.ts';
import { deleteRemoteHeads } from './0001_delete_remote_heads.ts';
import { selfCheckpointedFragments } from './0002_self_checkpointed_fragments.ts';

/**
 * Data migrations over the Subduction records in `automerge_chunks` — rewrites that need the
 * engine or a sweep, unlike the schema DDL in `migrations/chunks`. Each lives in its own numbered
 * file, runs once per database, and is recorded in `automerge_subduction_migrations` when it
 * reports itself complete; a later open skips it. Order is the order here, and a migration that
 * throws stops the run so the ones after it still see the store they were written against.
 */
export const SUBDUCTION_MIGRATIONS: readonly SubductionMigration[] = [deleteRemoteHeads, selfCheckpointedFragments];

export type SubductionMigrationContext = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  storage: SqliteStorageAdapter;
  /** The Repo's engine, before any document attached or any sync round ran: no tree is loaded yet. */
  subduction: Subduction;
};

export type SubductionMigrationResult = {
  /** Whether the migration is done for good and may be recorded; `false` means run again next open. */
  complete: boolean;
  /** Free-form counters for the log line. */
  counts: Record<string, number>;
};

export type SubductionMigration = {
  /** Ledger key: stable for the migration's lifetime, never reused. */
  name: string;
  run: (context: SubductionMigrationContext) => Promise<SubductionMigrationResult>;
};

const LEDGER_TABLE = 'automerge_subduction_migrations';

/** Whether `name` is recorded as applied. */
export const hasSubductionMigration = (name: string): Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{
      n: number;
    }>`SELECT count(*) AS n FROM automerge_subduction_migrations WHERE name = ${name}`;
    return rows[0].n > 0;
  });

/** Records `name` as applied. Idempotent. */
export const recordSubductionMigration = (name: string): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const appliedAt = Date.now();
    yield* sql`INSERT OR IGNORE INTO automerge_subduction_migrations (name, applied_at) VALUES (${name}, ${appliedAt})`;
  });

/**
 * Runs every migration in {@link SUBDUCTION_MIGRATIONS} that the ledger does not list yet.
 * Errors propagate: the caller decides what a failed migration means for the host.
 */
export const runSubductionMigrations = async (
  context: SubductionMigrationContext,
  migrations: readonly SubductionMigration[] = SUBDUCTION_MIGRATIONS,
): Promise<void> => {
  const run = RuntimeProvider.runPromise(context.runtime);
  for (const migration of migrations) {
    if (await run(hasSubductionMigration(migration.name))) {
      continue;
    }
    const startedAt = Date.now();
    const result = await migration.run(context);
    if (result.complete) {
      await run(recordSubductionMigration(migration.name));
    }
    log.info('subduction migration ran', {
      migration: migration.name,
      table: LEDGER_TABLE,
      recorded: result.complete,
      durationMs: Date.now() - startedAt,
      ...result.counts,
    });
  }
};
