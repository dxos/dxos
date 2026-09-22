//
// Copyright 2026 DXOS.org
//

import { type Subduction } from '@automerge/automerge-subduction/slim';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { RuntimeProvider } from '@dxos/effect';

import { type SqliteStorageAdapter, SUBDUCTION_PREFIX } from '../sqlite-storage-adapter.ts';
import { deleteRemoteHeads } from './0001_delete_remote_heads.ts';
import { type SubductionMigration, type SubductionMigrationLedger, runSubductionMigrations } from './framework.ts';
import {
  type FragmentRecordStore,
  type SelfCheckpointedFragmentsContext,
  bytesToHex,
  hexToBytes,
  selfCheckpointedFragments,
} from './self-checkpointed-fragments.ts';

const FRAGMENTS_FAMILY = 'fragments';
const FRAGMENT_BLOBS_FAMILY = 'fragment-blobs';

/**
 * The migrations `AutomergeHost.open()` runs over the Subduction records in `automerge_chunks`,
 * recorded in `automerge_subduction_migrations`. The client-only ones live in numbered files here;
 * the shared ones come from `./index.ts`. Order is the order here.
 */
export const SUBDUCTION_MIGRATIONS: readonly SubductionMigration<ClientSubductionMigrationContext>[] = [
  deleteRemoteHeads,
  selfCheckpointedFragments,
];

export type ClientSubductionMigrationContext = SelfCheckpointedFragmentsContext & {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  storage: SqliteStorageAdapter;
  /** The Repo's engine, before any document attached or any sync round ran: no tree is loaded yet. */
  subduction: Subduction;
};

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

/** The ledger in `automerge_subduction_migrations`, created by chunk migration `0002_subduction_migrations`. */
export const sqliteSubductionMigrationLedger = (
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>,
): SubductionMigrationLedger => {
  const run = RuntimeProvider.runPromise(runtime);
  return {
    hasMigration: (name) => run(hasSubductionMigration(name)),
    recordMigration: (name) => run(recordSubductionMigration(name)),
  };
};

/**
 * The fragment records as `SubductionStorageBridge` keeps them in the adapter: the signed record
 * under `[subduction, fragments, <sedimentreeId hex>, <head hex>]` and its blob under the
 * `fragment-blobs` twin.
 */
export const storageAdapterFragmentStore = (storage: SqliteStorageAdapter): FragmentRecordStore => ({
  loadFragmentRecords: async () => {
    const chunks = await storage.loadRange([SUBDUCTION_PREFIX, FRAGMENTS_FAMILY]);
    return chunks.flatMap(({ key, data }) =>
      key.length === 4 && data ? [{ sedimentreeId: hexToBytes(key[2]), head: hexToBytes(key[3]), signed: data }] : [],
    );
  },
  loadFragmentBlob: (sedimentreeId, head) =>
    storage.load([SUBDUCTION_PREFIX, FRAGMENT_BLOBS_FAMILY, bytesToHex(sedimentreeId), bytesToHex(head)]),
});

/** Runs {@link SUBDUCTION_MIGRATIONS} (or `migrations`) against the client's storage and ledger. */
export const runClientSubductionMigrations = (
  context: Omit<ClientSubductionMigrationContext, 'fragments'>,
  migrations: readonly SubductionMigration<ClientSubductionMigrationContext>[] = SUBDUCTION_MIGRATIONS,
): Promise<void> =>
  runSubductionMigrations(
    { ...context, fragments: storageAdapterFragmentStore(context.storage) },
    sqliteSubductionMigrationLedger(context.runtime),
    migrations,
  );
