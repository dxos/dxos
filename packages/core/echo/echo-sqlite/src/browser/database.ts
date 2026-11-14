//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as Scope from 'effect/Scope';

import { type Type } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import { SqliteDatabase } from '../database.ts';

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

export type OpenBrowserDatabaseOptions = {
  /** Starts the dedicated worker that runs SQLite over OPFS (`@dxos/sql-sqlite/OpfsWorker`). */
  worker: () => Worker;
  /** Names the database FILE: every tab of the origin opening the same file must use the same lock. */
  lockName: string;
  spaceId: SpaceId;
  types?: readonly Type.AnyEntity[];
};

/**
 * Claims the database file for this tab and holds the claim until the tab goes away.
 *
 * OPFS sync access handles are exclusive per file, and the SQLite worker waits for one rather than
 * failing, so a second tab would hang with nothing on screen. The lock answers at once: its callback
 * returns a promise that never settles, so the lock is released only when the tab closes.
 */
const claim = (lockName: string): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    navigator.locks
      .request(lockName, { ifAvailable: true }, (lock) => {
        resolve(lock !== null);
        return lock ? new Promise<never>(() => {}) : Promise.resolve();
      })
      .catch(reject);
  });

/**
 * Resolves once no other tab holds the database, without taking it: the caller reloads, and the
 * reloaded page claims it as usual.
 */
export const waitForDatabase = (lockName: string): Promise<void> =>
  navigator.locks.request(lockName, () => undefined).then(() => undefined);

/**
 * Opens a space's database in this browser: SQLite in a worker over OPFS, everything above it — the
 * compiler, hydration, reactivity — on the page. One tab per origin holds the file; another fails with
 * {@link DatabaseBusyError} and can {@link waitForDatabase}. The database stays open for the page's life.
 */
export const openBrowserDatabase = async (options: OpenBrowserDatabaseOptions): Promise<SqliteDatabase> => {
  if (!(await claim(options.lockName))) {
    throw new DatabaseBusyError();
  }

  const open = async (): Promise<SqliteDatabase> => {
    const runtime = ManagedRuntime.make(
      SqliteClient.layer({ worker: Effect.succeed(options.worker()) }).pipe(
        Layer.provideMerge(Reactivity.layer),
        Layer.orDie,
      ),
    );
    const scope = await runtime.runPromise(Scope.make());
    return runtime.runPromise(
      SqliteDatabase.open({ spaceId: options.spaceId, types: options.types }).pipe(Scope.provide(scope)),
    );
  };

  // The whole sequence, not just the last step: the worker takes its access handle while the layer is
  // built, so a window that cannot have one never reaches the open and would otherwise sit blank.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new DatabaseUnavailableError()), OPEN_TIMEOUT_MS);
  });
  try {
    return await Promise.race([open(), expired]);
  } finally {
    clearTimeout(timer);
  }
};
