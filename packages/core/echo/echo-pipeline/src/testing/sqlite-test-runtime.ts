//
// Copyright 2025 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as SqlClient from '@effect/sql/SqlClient';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { RuntimeProvider } from '@dxos/effect';
import { SqlTransaction } from '@dxos/sql-sqlite';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type TestSqliteRuntime = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
  dispose: () => Promise<void>;
};

/**
 * Creates an in-memory (or file-based) SQLite runtime for tests.
 * Use filename = ':memory:' for ephemeral in-memory storage.
 * Use a file path for persistence across open/close cycles.
 */
export const createTestSqliteRuntime = (filename = ':memory:'): TestSqliteRuntime => {
  const baseLayer = SqliteClient.layer({ filename });
  const txLayer = SqlTransaction.layer.pipe(Layer.provide(baseLayer));
  const rt = ManagedRuntime.make(Layer.merge(baseLayer, txLayer).pipe(Layer.orDie));
  return {
    runtime: rt.runtimeEffect,
    dispose: () => rt.dispose(),
  };
};
