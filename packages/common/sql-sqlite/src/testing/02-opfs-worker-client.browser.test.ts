//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as OpfsPool from '../OpfsPool';
import * as SqliteClient from '../SqliteClient';
import {
  copySqliteSnapshot,
  createSerializedDatabase,
  runWithOpfsSqliteClient,
  seedExportPoolImportAndHypercoreWrite,
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
        expect(OpfsPool.isValidSqliteDatabase(snapshot)).toBe(true);
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
        expect(OpfsPool.isValidSqliteDatabase(snapshot)).toBe(true);

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

  test('full export/import flow: write → async export → async import → read', async () => {
    const marker = `import-flow-${crypto.randomUUID()}`;

    // 1. Write via SqliteClient (OPFS worker), then release the pool handles.
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS import_flow_probe (marker TEXT NOT NULL)`;
        yield* client`DELETE FROM import_flow_probe`;
        yield* client`INSERT INTO import_flow_probe (marker) VALUES (${marker})`;
      }),
    );

    // 2. Export: raw async OPFS read (no SQLite, no worker).
    const exported = await OpfsPool.readDatabase();
    expect(OpfsPool.isValidSqliteDatabase(exported)).toBe(true);
    expect(exported.byteLength).toBeGreaterThan(0);

    // 3. Diverge the database so the import has something to restore.
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        yield* client`DELETE FROM import_flow_probe`;
        const rows = yield* client`SELECT marker FROM import_flow_probe`;
        expect(rows).toHaveLength(0);
      }),
    );

    // 4. Import: raw async OPFS write of the exported snapshot.
    await OpfsPool.writeDatabase(exported);

    // The pool payload must be byte-exact.
    const reread = await OpfsPool.readDatabase();
    expect(reread.byteLength).toBe(exported.byteLength);
    expect(reread).toEqual(exported);

    // 5. Read via a fresh SqliteClient — the imported state must be visible.
    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        const rows = yield* client`SELECT marker FROM import_flow_probe ORDER BY rowid`;
        expect(rows).toHaveLength(1);
        expect(rows[0].marker).toBe(marker);
      }),
    );
  });

  test('imports an external snapshot via raw pool write and reads it back', async () => {
    const source = await createSerializedDatabase('pool-import-e2e');

    await OpfsPool.writeDatabase(copySqliteSnapshot(source));

    await runWithOpfsSqliteClient(
      Effect.gen(function* () {
        const client = yield* SqlClient.SqlClient;
        const rows = yield* client`SELECT label FROM items ORDER BY id`;
        expect(rows).toHaveLength(1);
        expect(rows[0].label).toBe('pool-import-e2e');
      }),
    );
  });

  test('writes hypercore_files via layerOpfs after raw pool import', async () => {
    const result = (await seedExportPoolImportAndHypercoreWrite()) as { writtenBytes: number };
    expect(result.writtenBytes).toBe(4);
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
