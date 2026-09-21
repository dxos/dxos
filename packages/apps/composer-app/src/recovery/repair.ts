//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { deleteSubductionRemoteHeads } from '@dxos/echo-host';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

/**
 * Resolves once the OPFS worker reports it closed the database (the sqlite client's finalizer asks it to), or after
 * `timeoutMs`. The same handshake the client's own OPFS worker layer waits on before terminating the worker.
 */
const waitForOpfsWorkerClosed = (worker: Worker, timeoutMs = 30_000): Promise<void> =>
  new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.[0] === 'closed') {
        done();
      }
    };
    const done = () => {
      clearTimeout(timeout);
      worker.removeEventListener('message', onMessage);
      resolve();
    };
    const timeout = setTimeout(done, timeoutMs);
    worker.addEventListener('message', onMessage);
  });

/**
 * Deletes the stored Subduction remote heads and vacuums the file (see `deleteSubductionRemoteHeads`) straight from
 * the profile's OPFS database, through an OPFS worker of its own with no client running: the profiles that need this
 * are the ones whose boot cannot be trusted. OPFS access is exclusive, so nothing else may hold the database while it
 * runs.
 */
export const repairRemoteHeads = (
  onProgress?: (progress: { deleted: number; total: number }) => void,
): Promise<{ deleted: number; reclaimedBytes: number }> =>
  Effect.gen(function* () {
    const worker = yield* Effect.acquireRelease(
      Effect.sync(() => new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), { type: 'module' })),
      (worker) =>
        Effect.promise(async () => {
          await waitForOpfsWorkerClosed(worker);
          worker.terminate();
        }),
    );

    return yield* Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // A profile that never stored a document has no chunk table, and so nothing to delete.
      const tables = yield* sql`SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'automerge_chunks'`;
      if (tables.length === 0) {
        return { deleted: 0, reclaimedBytes: 0 };
      }
      return yield* deleteSubductionRemoteHeads({ onProgress });
    }).pipe(Effect.provide(SqliteClient.layer({ worker: Effect.succeed(worker) })));
  }).pipe(Effect.scoped, Effect.runPromise);
