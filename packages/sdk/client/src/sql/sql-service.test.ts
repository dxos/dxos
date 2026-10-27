//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, onTestFinished, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type SqlService } from '@dxos/protocols/rpc';

import { Client } from '../client/index.ts';
import { TestBuilder } from '../testing/index.ts';

describe('SqlService', () => {
  test('executes sanitized statements across the client services boundary', async ({ expect }) => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());

    const execute = (database: string, sql: string, params: SqlService.SqlValue[] = []) =>
      EffectEx.runPromise(
        client.services.rpc['SqlService.execute']({ database, sql, params }).pipe(Effect.map(({ rows }) => rows)),
      );
    const rejection = (database: string, sql: string) =>
      EffectEx.runPromise(
        client.services.rpc['SqlService.execute']({ database, sql, params: [] }).pipe(
          Effect.flip,
          Effect.map((error) => error.reason._tag),
        ),
      );

    expect(await execute('notes', 'CREATE TABLE items (id INTEGER PRIMARY KEY, big INTEGER, data BLOB)')).toEqual([]);
    await execute('notes', 'INSERT INTO items (id, big, data) VALUES (?, ?, ?)', [
      1,
      9_007_199_254_740_993n,
      new Uint8Array([1, 2, 3]),
    ]);
    expect(await execute('notes', 'SELECT id, CAST(big AS TEXT) AS big, data FROM items')).toEqual([
      { id: 1, big: '9007199254740993', data: new Uint8Array([1, 2, 3]) },
    ]);

    const rpc = client.services.rpc;
    const inTransaction = async (end: 'SqlService.commit' | 'SqlService.rollback', id: number) => {
      const { transaction } = await EffectEx.runPromise(rpc['SqlService.begin']({ database: 'notes' }));
      await EffectEx.runPromise(
        rpc['SqlService.execute']({
          database: 'notes',
          sql: 'INSERT INTO items (id) VALUES (?)',
          params: [id],
          transaction,
        }),
      );
      await EffectEx.runPromise(rpc[end]({ transaction }));
    };
    await inTransaction('SqlService.rollback', 2);
    await inTransaction('SqlService.commit', 3);
    expect(await execute('notes', 'SELECT id FROM items ORDER BY id')).toEqual([{ id: 1 }, { id: 3 }]);

    expect(await rejection('other', 'SELECT * FROM items')).toBe('AuthorizationError');
    expect(await rejection('notes', 'SELECT * FROM keyring')).toBe('AuthorizationError');
    expect(await rejection('notes', 'SELECT name FROM sqlite_master')).toBe('AuthorizationError');
    expect(await rejection('notes', 'PRAGMA journal_mode')).toBe('AuthorizationError');
  });
});
