//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as Scope from 'effect/Scope';

import type { Type } from '@dxos/echo';
import { SqliteDatabase } from '@dxos/echo-sqlite';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import { spaceIdForSlug } from './slug.ts';

export type Opened = {
  readonly db: SqliteDatabase;
};

/** How long the worker has to open the file before the page says so rather than showing nothing. */
const OPEN_TIMEOUT_MS = 15_000;

/** The worker never answered: the handle it waits for is held by something this page cannot see. */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super(`The database did not open within ${OPEN_TIMEOUT_MS / 1000}s.`);
    this.name = 'DatabaseUnavailableError';
  }
}

/** Another tab of this origin holds the database file this one needs. */
export class DatabaseBusyError extends Error {
  constructor() {
    super('The database is already open in another tab.');
    this.name = 'DatabaseBusyError';
  }
}

/**
 * The lock names the FILE, not the graph. One SQLite file holds every space of this origin, so a second tab is
 * refused whichever graph it asks for — naming the slug here let two tabs on different graphs both pass the claim
 * and then hang on the handle, with nothing on screen.
 */
const DATABASE_LOCK = 'echo-sqlite-demo:opfs';

/**
 * Claims this device's database for the page, and holds the claim until the page goes away.
 *
 * OPFS sync access handles are exclusive per file, and the SQLite worker waits for one rather than failing, so a
 * second tab would hang with nothing on screen. A web lock answers the same question at once: the callback holds
 * the lock in a promise that never settles, so the lock is released only when the tab closes.
 */
const claim = (): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    navigator.locks
      .request(DATABASE_LOCK, { ifAvailable: true }, (lock) => {
        resolve(lock !== null);
        return lock ? new Promise<never>(() => {}) : Promise.resolve();
      })
      .catch(reject);
  });

/**
 * Resolves once no other tab holds the database, without taking it: the caller reloads, and the
 * reloaded page claims it as usual.
 */
export const waitForDatabase = (): Promise<void> =>
  navigator.locks.request(DATABASE_LOCK, () => undefined).then(() => undefined);

/**
 * Opens the database on this device. SQLite lives in a worker (OPFS sync access handles exist only
 * there); everything above it — the query compiler, object hydration, reactivity — runs here on the
 * main thread, which is what lets `@dxos/echo-react` bind to it with no bridge.
 *
 * Reads and writes never touch the network. Sync runs beside it; see `sync.ts`.
 *
 * The scope is the page: it is opened and never closed, so the database outlives this call.
 */
export const openDatabase = async (slug: string, types: readonly Type.AnyObj[]): Promise<Opened> => {
  if (!(await claim())) {
    throw new DatabaseBusyError();
  }

  const open = async (): Promise<SqliteDatabase> => {
    const worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });
    const runtime = ManagedRuntime.make(
      SqliteClient.layer({ worker: Effect.succeed(worker) }).pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie),
    );

    const spaceId = await spaceIdForSlug(slug);
    const scope = await runtime.runPromise(Scope.make());
    return runtime.runPromise(SqliteDatabase.open({ spaceId, types: [...types] }).pipe(Scope.provide(scope)));
  };

  // The whole sequence, not just the last step: the worker takes its access handle while the layer is built, so a
  // window that cannot have one — an origin whose storage is blocked, or a handle a closed tab has not released —
  // never even reaches the open and would otherwise sit blank forever.
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DatabaseUnavailableError()), OPEN_TIMEOUT_MS);
  });
  try {
    return { db: await Promise.race([open(), expired]) };
  } finally {
    clearTimeout(timer!);
  }
};
