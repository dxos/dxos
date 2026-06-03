//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { describe, expect, onTestFinished, test } from 'vitest';

import { verifySignature } from '@dxos/crypto';
import { RuntimeProvider } from '@dxos/effect';
import { layerMemory as sqliteLayerMemory } from '@dxos/sql-sqlite/platform';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { SqliteKeyring } from './sqlite-keyring';

const makeRuntime = () => {
  const rt = ManagedRuntime.make(SqlTransaction.layer.pipe(Layer.provideMerge(sqliteLayerMemory)).pipe(Layer.orDie));
  onTestFinished(() => rt.dispose());
  return rt.runtimeEffect;
};

describe('SqliteKeyring', () => {
  test('creates and verifies key', async () => {
    const runtime = makeRuntime();
    const keyring = new SqliteKeyring({ runtime });

    // Run migration
    await RuntimeProvider.runPromise(runtime)(keyring.migrate);

    // Create key
    const key = await keyring.createKey();
    expect(key).toBeDefined();

    // Sign and verify
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);
    expect(await verifySignature(key, message, signature)).toBeTruthy();
  });

  test('lists keys', async () => {
    const runtime = makeRuntime();
    const keyring = new SqliteKeyring({ runtime });
    await RuntimeProvider.runPromise(runtime)(keyring.migrate);

    for (let i = 0; i < 3; i++) {
      await keyring.createKey();
    }
    const keys = await keyring.list();
    expect(keys).toHaveLength(3);
  });

  test('direct sql insert works', async () => {
    const runtime = makeRuntime();
    await RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, val TEXT)`;
        yield* sql`INSERT INTO test_table (val) VALUES (${'hello'})`;
        const rows = yield* sql<{ val: string }>`SELECT val FROM test_table`;
        expect(rows[0].val).toBe('hello');
      }),
    );
  });
});
