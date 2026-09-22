//
// Copyright 2026 DXOS.org
//

import { type Subduction } from '@automerge/automerge-subduction';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';

import { type SqliteStorageAdapter } from '../sqlite-storage-adapter.ts';
import { deleteRemoteHeads } from './0001_delete_remote_heads.ts';
import { selfCheckpointedFragments } from './0002_self_checkpointed_fragments.ts';

/**
 * Data migrations over the Subduction records in `automerge_chunks` — rewrites that need the
 * engine or a sweep, unlike the schema DDL in `migrations/chunks`. Each lives in its own numbered
 * file and is recorded in `automerge_subduction_migrations` when it reports itself done; a later
 * open skips it. Order is the order here, and a migration that throws stops the run so the ones
 * after it still see the store they were written against.
 *
 * EVERY MIGRATION MUST BE IDEMPOTENT. Applying and recording are separate commits, and an open can
 * die between them, so a migration reruns against a database it already changed and must change
 * nothing the second time. The ledger is a performance optimization only — it saves the rerun's
 * sweep of every stored record on every open — never what makes a migration safe: a database must
 * be correct with the migration applied any number of times, with or without its ledger row.
 */
export const MIGRATIONS: readonly Migration[] = [deleteRemoteHeads, selfCheckpointedFragments];

export type MigrationContext = {
  /** The Repo's engine, before any document attached or any sync round ran: no tree is loaded yet. */
  subduction: Subduction;
  storage: SqliteStorageAdapter;
};

export type Migration = {
  /** Ledger key: stable for the migration's lifetime, never reused. */
  name: string;
  /**
   * Resolves `true` once nothing is left to do, so the run is recorded; `false` runs it again next
   * open. Must be idempotent (see {@link MIGRATIONS}): it can run again after a crash, recorded or not.
   */
  run: (context: MigrationContext) => Promise<boolean>;
};

/**
 * Runs every migration in `migrations` that the ledger does not list yet. Errors propagate: the
 * caller decides what a failed migration means for the host.
 */
export const runMigrations = async (
  context: MigrationContext,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<void> => {
  const run = RuntimeProvider.runPromise(context.storage.runtime);
  for (const migration of migrations) {
    if (await run(hasMigration(migration.name))) {
      continue;
    }
    const startedAt = Date.now();
    const done = await migration.run(context);
    if (done) {
      await run(recordMigration(migration.name));
    }
    log.info('subduction migration ran', {
      migration: migration.name,
      recorded: done,
      durationMs: Date.now() - startedAt,
    });
  }
};

const hasMigration = (name: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql<{
      n: number;
    }>`SELECT count(*) AS n FROM automerge_subduction_migrations WHERE name = ${name}`;
    return rows[0].n > 0;
  });

const recordMigration = (name: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const appliedAt = Date.now();
    yield* sql`INSERT OR IGNORE INTO automerge_subduction_migrations (name, applied_at) VALUES (${name}, ${appliedAt})`;
  });
