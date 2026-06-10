//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import * as Reactivity from '@effect/experimental/Reactivity';
import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as OpfsPool from '../OpfsPool';
import * as SqliteClient from '../SqliteClient';
import { TEST_HALO_CONTROL_FEED_KEY } from './opfs-test-helpers';

const DB_NAME = 'DXOS';

type InWorkerRequest = ['run', testCase: string, payload?: string | Uint8Array];

type InWorkerResponse = ['ready'] | ['result', unknown] | ['error', string];

const clientLayer = SqliteClient.layerOpfs({ dbName: DB_NAME }).pipe(Layer.provideMerge(Reactivity.layer));

const runWithClient = <A, E>(program: Effect.Effect<A, E, SqlClient.SqlClient | SqliteClient.SqliteClient>) =>
  program.pipe(Effect.provide(clientLayer), Effect.scoped);

const runTest = (testCase: string, payload?: string | Uint8Array): Effect.Effect<unknown, Error> =>
  Effect.gen(function* () {
    switch (testCase) {
      case 'crud': {
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS in_worker_users (id INTEGER PRIMARY KEY, name TEXT)`;
        yield* client`DELETE FROM in_worker_users`;
        yield* client`INSERT INTO in_worker_users (name) VALUES ('Alice')`;
        yield* client`INSERT INTO in_worker_users (name) VALUES ('Bob')`;
        const results = yield* client`SELECT name FROM in_worker_users ORDER BY id`;
        return { names: results.map((row) => row.name) };
      }
      case 'export': {
        const sql = yield* SqliteClient.SqliteClient;
        yield* sql`CREATE TABLE IF NOT EXISTS in_worker_export (value TEXT)`;
        yield* sql`DELETE FROM in_worker_export`;
        yield* sql`INSERT INTO in_worker_export (value) VALUES ('in-worker')`;
        const snapshot = yield* sql.export;
        return {
          byteLength: snapshot.byteLength,
          valid: OpfsPool.isValidSqliteDatabase(snapshot),
        };
      }
      case 'import': {
        if (!(payload instanceof Uint8Array)) {
          return yield* Effect.fail(new Error('import test requires Uint8Array payload'));
        }
        const sql = yield* SqliteClient.SqliteClient;
        const copy = new Uint8Array(payload.byteLength);
        copy.set(payload);
        yield* sql.import(copy);
        const rows = yield* sql`SELECT label FROM items ORDER BY id`;
        return { label: rows[0]?.label };
      }
      case 'import-roundtrip': {
        const sql = yield* SqliteClient.SqliteClient;
        yield* sql`CREATE TABLE IF NOT EXISTS in_worker_roundtrip (value TEXT)`;
        yield* sql`DELETE FROM in_worker_roundtrip`;
        yield* sql`INSERT INTO in_worker_roundtrip (value) VALUES ('roundtrip')`;
        const snapshot = yield* sql.export;
        yield* sql`DROP TABLE in_worker_roundtrip`;
        const copy = new Uint8Array(snapshot.byteLength);
        copy.set(snapshot);
        yield* sql.import(copy);
        const restored = yield* sql`SELECT value FROM in_worker_roundtrip`;
        return { value: restored[0]?.value };
      }
      case 'persist-write': {
        if (typeof payload !== 'string') {
          return yield* Effect.fail(new Error('persist-write test requires string payload'));
        }
        const client = yield* SqlClient.SqlClient;
        yield* client`CREATE TABLE IF NOT EXISTS in_worker_persist (marker TEXT NOT NULL)`;
        yield* client`DELETE FROM in_worker_persist`;
        yield* client`INSERT INTO in_worker_persist (marker) VALUES (${payload})`;
        return { written: payload };
      }
      case 'persist-read': {
        const client = yield* SqlClient.SqlClient;
        const rows = yield* client`SELECT marker FROM in_worker_persist ORDER BY rowid`;
        return { marker: rows[0]?.marker };
      }
      case 'seed-hypercore-profile': {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE IF NOT EXISTS hypercore_files (
          path TEXT PRIMARY KEY,
          data BLOB NOT NULL DEFAULT x''
        )`;
        const feedKey = TEST_HALO_CONTROL_FEED_KEY;
        const seedPath = `/sqlite-feeds/feeds/${feedKey}/bitfield`;
        const seedData = new Uint8Array([1, 2, 3, 4]);
        yield* sql`INSERT OR REPLACE INTO hypercore_files (path, data) VALUES (${seedPath}, ${seedData})`;
        const count = yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM hypercore_files`;
        return { seeded: true, count: Number(count[0]?.n ?? 0) };
      }
      case 'hypercore-write-after-import': {
        const sql = yield* SqlClient.SqlClient;
        const feedKey = TEST_HALO_CONTROL_FEED_KEY;
        const filePath = `/sqlite-feeds/feeds/${feedKey}/data`;
        const existing = yield* sql<{ data: Uint8Array }>`SELECT data FROM hypercore_files WHERE path = ${filePath}`;
        const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        yield* sql`INSERT OR REPLACE INTO hypercore_files (path, data) VALUES (${filePath}, ${data})`;
        const rows = yield* sql<{ data: Uint8Array }>`SELECT data FROM hypercore_files WHERE path = ${filePath}`;
        return {
          previousCount: existing.length,
          writtenBytes: rows[0]?.data?.byteLength ?? 0,
        };
      }
      default:
        return yield* Effect.fail(new Error(`Unknown in-worker test case: ${testCase}`));
    }
  }).pipe(
    Effect.mapError((error) => (error instanceof Error ? error : new Error(String(error)))),
    (effect) => runWithClient(effect),
  );

self.addEventListener('message', (event: MessageEvent<InWorkerRequest>) => {
  const message = event.data;
  if (message[0] !== 'run') {
    return;
  }

  const [, testCase, payload] = message;
  void Effect.runFork(
    runTest(testCase, payload).pipe(
      Effect.match({
        onFailure: (error) => {
          self.postMessage(['error', error.message] satisfies InWorkerResponse);
        },
        onSuccess: (result) => {
          self.postMessage(['result', result] satisfies InWorkerResponse);
        },
      }),
    ),
  );
});

self.postMessage(['ready'] satisfies InWorkerResponse);
