//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import { describe, expect, test } from 'vitest';
import * as Effect from 'effect/Effect';

import * as SqliteClient from '../SqliteClient';

import {
  copySqliteSnapshot,
  createSerializedDatabase,
  isValidSqliteDatabase,
  runWithOpfsSqliteClient,
} from './opfs-test-helpers';

describe('opfs SqliteClient browser test', { timeout: 120_000, sequential: true }, () => {
  test('runs CRUD via SqliteClient and OPFS worker', async () => {
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`;
        yield* client`INSERT INTO users (name) VALUES ('Alice')`;
        yield* client`INSERT INTO users (name) VALUES ('Bob')`;
        const results = yield* client`SELECT * FROM users ORDER BY id`;

        expect(results).toHaveLength(2);
        expect(results[0].name).toBe('Alice');
        expect(results[1].name).toBe('Bob');
      }),
    );
  });

  test('exports database bytes via SqliteClient', async () => {
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const sql = yield* SqliteClient.SqliteClient;
        yield* sql`CREATE TABLE IF NOT EXISTS export_probe (value TEXT)`;
        yield* sql`DELETE FROM export_probe`;
        yield* sql`INSERT INTO export_probe (value) VALUES ('snapshot')`;

        const snapshot = yield* sql.export;
        expect(snapshot.byteLength).toBeGreaterThan(100);
        expect(isValidSqliteDatabase(snapshot)).toBe(true);
      }),
    );
  });

  test('imports external snapshot via SqliteClient', async () => {
    const source = await createSerializedDatabase('external-import');

    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const sql = yield* SqliteClient.SqliteClient;
        yield* sql.import(copySqliteSnapshot(source));

        const rows = yield* sql`SELECT label FROM items ORDER BY id`;
        expect(rows).toHaveLength(1);
        expect(rows[0].label).toBe('external-import');
      }),
    );
  });

  test('exports and re-imports database via SqliteClient', async () => {
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const sql = yield* SqliteClient.SqliteClient;
        yield* sql`CREATE TABLE IF NOT EXISTS roundtrip_probe (value TEXT)`;
        yield* sql`DELETE FROM roundtrip_probe`;
        yield* sql`INSERT INTO roundtrip_probe (value) VALUES ('roundtrip')`;

        const snapshot = yield* sql.export;
        expect(isValidSqliteDatabase(snapshot)).toBe(true);

        yield* sql`DROP TABLE roundtrip_probe`;
        const empty = yield* sql`SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'roundtrip_probe'`;
        expect(empty).toHaveLength(0);

        yield* sql.import(copySqliteSnapshot(snapshot));

        const restored = yield* sql`SELECT value FROM roundtrip_probe`;
        expect(restored).toHaveLength(1);
        expect(restored[0].value).toBe('roundtrip');
      }),
    );
  });

  test('persists data across worker restart', async () => {
    const marker = `persist-${crypto.randomUUID()}`;

    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS opfs_client_persist_probe (marker TEXT NOT NULL)`;
        yield* client`DELETE FROM opfs_client_persist_probe`;
        yield* client`INSERT INTO opfs_client_persist_probe (marker) VALUES (${marker})`;
      }),
    );

    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        const rows = yield* client`SELECT marker FROM opfs_client_persist_probe ORDER BY rowid`;
        expect(rows).toHaveLength(1);
        expect(rows[0].marker).toBe(marker);
      }),
    );
  });
});
