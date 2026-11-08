//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as Scope from 'effect/Scope';
import * as SqlClient from 'effect/sql/SqlClient';

import { SqliteDatabase } from '@dxos/echo-sqlite';
import { SpaceId } from '@dxos/keys';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import { types } from '../schema.ts';

/** Must match the `dbName` the OPFS worker opens. */
export const DB_NAME = 'ECHO_SQLITE_DEMO';

/**
 * One fixed space, so every visitor and every device sees the same graph once synced. `open` would
 * otherwise mint a random one per session, and one SQLite file can hold several spaces.
 */
export const SPACE_ID = SpaceId.make('BECHOSQLITEDEMOAAAAAAAAAAAAAAAAAA');

export type Opened = {
  readonly db: SqliteDatabase;
  /**
   * Flushes pending writes and folds the WAL back into the database file.
   *
   * Required before reading the file for a push: the OPFS connection runs in WAL mode, so committed
   * rows live in the `-wal` sidecar until a checkpoint, and `OpfsPool.readDatabase` reads only the
   * main file. Without this a push uploads a valid but empty 4 KB database — it fails silently.
   */
  readonly checkpoint: () => Promise<void>;
  /**
   * Terminates the OPFS worker, releasing its sync access handles.
   *
   * Required before replacing the database file on a pull: while the worker holds the handles,
   * `OpfsPool.wipe` fails with `NoModificationAllowedError`. The caller reloads afterwards — this
   * leaves no usable database behind.
   */
  readonly release: () => void;
};

/**
 * Opens the database on this device. SQLite lives in a worker (OPFS sync access handles exist only
 * there); everything above it — the query compiler, object hydration, reactivity — runs here on the
 * main thread, which is what lets `@dxos/echo-react` bind to it with no bridge.
 *
 * Reads and writes never touch the network. The Worker holds a copy; see `sync.ts`.
 *
 * The scope is the page: it is opened and never closed, so the database outlives this call.
 */
export const openDatabase = async (): Promise<Opened> => {
  const worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });
  const runtime = ManagedRuntime.make(
    SqliteClient.layer({ worker: Effect.succeed(worker) }).pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie),
  );

  const scope = await runtime.runPromise(Scope.make());
  const db = await runtime.runPromise(SqliteDatabase.open({ spaceId: SPACE_ID, types }).pipe(Scope.provide(scope)));

  const checkpoint = async (): Promise<void> => {
    await db.flush();
    await runtime.runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`PRAGMA wal_checkpoint(TRUNCATE)`;
      }).pipe(Effect.orDie),
    );
  };

  return { db, checkpoint, release: () => worker.terminate() };
};
