//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Reactivity from 'effect/reactivity/Reactivity';
import * as Scope from 'effect/Scope';

import { SqliteDatabase } from '@dxos/echo-sqlite';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

import { types } from '../schema.ts';
import { spaceIdForSlug } from './slug.ts';

export { spaceIdForSlug } from './slug.ts';

export type Opened = {
  readonly db: SqliteDatabase;
};

/**
 * Opens the database on this device. SQLite lives in a worker (OPFS sync access handles exist only
 * there); everything above it — the query compiler, object hydration, reactivity — runs here on the
 * main thread, which is what lets `@dxos/echo-react` bind to it with no bridge.
 *
 * Reads and writes never touch the network. Sync runs beside it; see `sync.ts`.
 *
 * The scope is the page: it is opened and never closed, so the database outlives this call.
 */
export const openDatabase = async (slug: string): Promise<Opened> => {
  const worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), { type: 'module' });
  const runtime = ManagedRuntime.make(
    SqliteClient.layer({ worker: Effect.succeed(worker) }).pipe(Layer.provideMerge(Reactivity.layer), Layer.orDie),
  );

  const spaceId = await spaceIdForSlug(slug);
  const scope = await runtime.runPromise(Scope.make());
  const db = await runtime.runPromise(SqliteDatabase.open({ spaceId, types }).pipe(Scope.provide(scope)));

  return { db };
};
