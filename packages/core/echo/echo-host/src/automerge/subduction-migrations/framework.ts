//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Data migrations over stored Subduction records — rewrites that need the engine or a sweep, as
 * opposed to schema DDL. Storage-agnostic: a migration sees only the `Context` its list is run with,
 * and the ledger it is recorded in is whatever the store keeps beside its records, so the same
 * migration runs over a client's `automerge_chunks` and an edge Durable Object's `sub_fragments`.
 *
 * Each migration runs once per store and is recorded when it reports itself complete; a later start
 * skips it. Order is the order of the list, and a migration that throws stops the run so the ones
 * after it still see the store they were written against.
 */
export type SubductionMigration<Context> = {
  /** Ledger key: stable for the migration's lifetime, never reused. */
  name: string;
  run: (context: Context) => Promise<SubductionMigrationResult>;
};

export type SubductionMigrationResult = {
  /** Whether the migration is done for good and may be recorded; `false` means run again next start. */
  complete: boolean;
  /** Free-form counters for the log line. */
  counts: Record<string, number>;
};

/** Where a store remembers which migrations have been applied to it. */
export type SubductionMigrationLedger = {
  hasMigration(name: string): Promise<boolean>;
  /** Idempotent. */
  recordMigration(name: string): Promise<void>;
};

/**
 * Runs every migration in `migrations` that `ledger` does not list yet. Errors propagate: the caller
 * decides what a failed migration means for the engine it built.
 */
export const runSubductionMigrations = async <Context>(
  context: Context,
  ledger: SubductionMigrationLedger,
  migrations: readonly SubductionMigration<Context>[],
): Promise<void> => {
  for (const migration of migrations) {
    if (await ledger.hasMigration(migration.name)) {
      continue;
    }
    const startedAt = Date.now();
    const result = await migration.run(context);
    if (result.complete) {
      await ledger.recordMigration(migration.name);
    }
    log.info('subduction migration ran', {
      migration: migration.name,
      recorded: result.complete,
      durationMs: Date.now() - startedAt,
      ...result.counts,
    });
  }
};
