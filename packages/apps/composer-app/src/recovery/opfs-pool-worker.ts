//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import * as Effect from 'effect/Effect';

import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

const DB_NAME = 'DXOS';

type PoolWorkerMessage = ['write', id: number, data: Uint8Array] | ['close'];

/**
 * Import SQLite bytes through the native SQLite path: open the OPFS database via
 * AccessHandlePoolVFS, deserialize + VACUUM (persists through the VFS), then export
 * to report the authoritative post-import size.
 */
const importDatabase = (data: Uint8Array) =>
  Effect.gen(function* () {
    const sql = yield* SqliteClient.SqliteClient;
    yield* sql.import(data);
    const snapshot = yield* sql.export;
    return snapshot.byteLength;
  }).pipe(Effect.provide(SqliteClient.layerOpfs({ dbName: DB_NAME })), Effect.scoped);

self.addEventListener('message', (event: MessageEvent<PoolWorkerMessage>) => {
  const message = event.data;
  if (message[0] === 'close') {
    self.close();
    return;
  }

  const [, id, data] = message;
  const payload = new Uint8Array(data.byteLength);
  payload.set(data);

  void Effect.runFork(
    importDatabase(payload).pipe(
      Effect.match({
        onFailure: (error) => {
          const text = error instanceof Error ? error.message : String(error);
          self.postMessage([id, text, undefined]);
        },
        onSuccess: (exportByteLength) => {
          self.postMessage([id, undefined, exportByteLength]);
        },
      }),
    ),
  );
});

self.postMessage(['ready', undefined, undefined]);
