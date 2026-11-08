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

/** A graph is open in another tab of this browser, which holds the file this one needs. */
export class DatabaseBusyError extends Error {
  constructor(readonly slug: string) {
    super(`The graph "${slug}" is already open in another tab.`);
    this.name = 'DatabaseBusyError';
  }
}

/**
 * Claims this device's copy of the graph for the page, and holds the claim until the page goes away.
 *
 * OPFS sync access handles are exclusive per file, and the SQLite worker waits for one rather than failing, so a
 * second tab would hang with nothing on screen. A web lock answers the same question at once: the callback holds
 * the lock in a promise that never settles, so the lock is released only when the tab closes.
 */
const claim = (slug: string): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    navigator.locks
      .request(`echo-sqlite-demo:${slug}`, { ifAvailable: true }, (lock) => {
        resolve(lock !== null);
        return lock ? new Promise<never>(() => {}) : Promise.resolve();
      })
      .catch(reject);
  });

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
  if (!(await claim(slug))) {
    throw new DatabaseBusyError(slug);
  }

  const worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });
  const runtime = ManagedRuntime.make(
    SqliteClient.layer({ worker: Effect.succeed(worker) }).pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie),
  );

  const spaceId = await spaceIdForSlug(slug);
  const scope = await runtime.runPromise(Scope.make());
  const db = await runtime.runPromise(SqliteDatabase.open({ spaceId, types: [...types] }).pipe(Scope.provide(scope)));

  return { db };
};
