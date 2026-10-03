//
// Copyright 2026 DXOS.org
//

// Runs under Node's type stripping, outside vite: hence the built package entry and erasable syntax only.

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as SqlClient from 'effect/sql/SqlClient';
import { DatabaseSync, type SupportedValueType } from 'node:sqlite';
import { workerData } from 'node:worker_threads';

import { runWith, serveStore } from '@dxos/echo-sqlite';

/**
 * Hosts SQLite on a worker thread behind one of the two RPC boundaries the bench compares.
 * - `op`: {@link serveStore}; each database operation (query, load, write batch) crosses once.
 * - `statement`: the `@effect/sql-sqlite-wasm` worker protocol the browser's OPFS worker speaks; each SQL
 *   statement (including `BEGIN`/`COMMIT`) crosses once.
 */
export type StoreWorkerData = { filename: string; mode: 'op' | 'statement'; port: MessagePort };

const { filename, mode, port }: StoreWorkerData = workerData;

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

if (mode === 'op') {
  const runtime = ManagedRuntime.make(SqliteClient.layer({ filename }));
  const context = await runtime.runPromise(Effect.context<SqlClient.SqlClient>());
  serveStore(port, runWith(context));
} else {
  const db = new DatabaseSync(filename);
  // The op-mode worker and the main thread write the same file.
  db.exec('PRAGMA busy_timeout = 5000');
  port.addEventListener('message', (event) => {
    const message: [id: number | string, sql: string, params: SupportedValueType[]] = event.data;
    const [id, sql, params] = message;
    if (typeof id !== 'number') {
      if (id === 'close') {
        db.close();
        port.close();
      }
      return;
    }
    try {
      const rows = db
        .prepare(sql)
        .all(...params)
        .filter(isRow);
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      port.postMessage([id, undefined, [rows.map(() => columns), rows.map((row) => columns.map((key) => row[key]))]]);
    } catch (error) {
      port.postMessage([id, String(error), undefined]);
    }
  });
  port.start();
  port.postMessage(['ready', undefined, undefined]);
}
