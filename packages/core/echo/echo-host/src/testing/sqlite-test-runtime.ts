//
// Copyright 2025 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RuntimeProvider } from '@dxos/effect';

import { SqliteStorageAdapter, type SqliteStorageCallbacks } from '../automerge/sqlite-storage-adapter.ts';

export type TestSqliteRuntime = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  dispose: () => Promise<void>;
};

/**
 * Creates an in-memory (or file-based) SQLite runtime for tests.
 * Use filename = ':memory:' for ephemeral in-memory storage.
 * Use a file path for persistence across open/close cycles.
 */
export const createTestSqliteRuntime = (filename = ':memory:'): TestSqliteRuntime => {
  const baseLayer = SqliteClient.layer({ filename });
  const txLayer = baseLayer;
  const rt = ManagedRuntime.make(Layer.merge(baseLayer, txLayer).pipe(Layer.orDie));
  return {
    runtime: rt.contextEffect,
    dispose: () => rt.dispose(),
  };
};

export type TestSqliteStorageAdapter = {
  adapter: SqliteStorageAdapter;
  dispose: () => Promise<void>;
};

/**
 * Opens a migrated {@link SqliteStorageAdapter} over a fresh SQLite runtime.
 * `dispose` closes the adapter and tears down the runtime.
 *
 * `callbacks` lets a test wait for a write to actually land — `save` no-ops once the adapter is
 * closed, so sleeping and hoping an auto-save fired first silently drops it.
 */
export const createTestSqliteStorageAdapter = async (
  filename = ':memory:',
  callbacks?: SqliteStorageCallbacks,
): Promise<TestSqliteStorageAdapter> => {
  const { runtime, dispose } = createTestSqliteRuntime(filename);
  const adapter = new SqliteStorageAdapter({ runtime, callbacks });
  await adapter.open();
  await RuntimeProvider.runPromise(runtime)(adapter.migrate);
  return {
    adapter,
    dispose: async () => {
      await adapter.close();
      await dispose();
    },
  };
};
