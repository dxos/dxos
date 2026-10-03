//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import * as SqliteStorage from './SqliteStorage.ts';

// `SqliteRandomAccessFile._loadFromDb` swallows a read that races client teardown only when the
// error signals a closed connection. Getting this predicate wrong reintroduces the flake where a
// background load rejects unhandled after the SQL connection closed, crashing the whole test
// worker (exit 1 with no failing test).
describe('isClosedConnectionError', () => {
  test('matches the raw sqlite closed-connection error', () => {
    expect(SqliteStorage.isClosedConnectionError(new TypeError('The database connection is not open'))).toBe(true);
  });

  test('matches when wrapped in an effect SqlError cause chain', () => {
    const wrapped = Object.assign(new Error('Failed to execute statement'), {
      _tag: 'SqlError',
      cause: new TypeError('The database connection is not open'),
    });
    expect(SqliteStorage.isClosedConnectionError(wrapped)).toBe(true);
  });

  test('matches a plain string message', () => {
    expect(SqliteStorage.isClosedConnectionError('SqliteError: the database connection is not open')).toBe(true);
  });

  test('does not match a genuine query error against a live connection', () => {
    const real = Object.assign(new Error('Failed to execute statement'), {
      cause: new Error('no such table: hypercore_files'),
    });
    expect(SqliteStorage.isClosedConnectionError(real)).toBe(false);
  });

  test('is safe on null / undefined / non-error values', () => {
    expect(SqliteStorage.isClosedConnectionError(null)).toBe(false);
    expect(SqliteStorage.isClosedConnectionError(undefined)).toBe(false);
    expect(SqliteStorage.isClosedConnectionError(42)).toBe(false);
  });

  test('terminates on a self-referential cause chain', () => {
    const cyclic: any = new Error('boom');
    cyclic.cause = cyclic;
    expect(SqliteStorage.isClosedConnectionError(cyclic)).toBe(false);
  });
});

describe('SqliteStorage', () => {
  test('a write that leaves the file unchanged is not persisted', async () => {
    const managed = ManagedRuntime.make(layerMemory.pipe(Layer.orDie));
    onTestFinished(() => managed.dispose());
    const run = RuntimeProvider.runPromise(managed.contextEffect);
    const storage = new SqliteStorage.SqliteStorage({ runtime: managed.contextEffect });
    await run(storage.migrate);
    onTestFinished(() => storage.close());

    const selectRows = Effect.flatMap(
      SqlClient.SqlClient,
      (sql) => sql<{ data: Uint8Array }>`SELECT data FROM hypercore_files`,
    );
    // Dropping the row behind the file's back makes any later save visible as a reappearing row.
    const deleteRows = Effect.flatMap(SqlClient.SqlClient, (sql) => sql`DELETE FROM hypercore_files`);
    const stored = () => run(selectRows);
    const dropRow = () => run(deleteRows);

    const file = storage.createDirectory('feeds').getOrCreateFile('feed/bitfield');
    await file.write(0, Buffer.from('abc'));
    await dropRow();

    await file.write(0, Buffer.from('abc'));
    await file.write(1, Buffer.from('b'));
    expect(await stored()).toHaveLength(0);

    await file.write(1, Buffer.from('x'));
    expect((await stored()).map(({ data }) => Buffer.from(data).toString())).toEqual(['axc']);

    // Growing the file is a change even when the appended bytes are zeroes.
    await dropRow();
    await file.write(3, Buffer.alloc(1));
    expect(await stored()).toHaveLength(1);
  });
});
