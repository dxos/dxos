//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/sql/SqlError';

import { type Database, openError } from '../internal/sql-storage.ts';

export type { Cursor, Database, Storage, Value } from '../internal/sql-storage.ts';

// A Worker bundle cannot carry wa-sqlite's wasm, and a Durable Object already has `ctx.storage.sql`.
const unavailable = (target: string): Effect.Effect<Database, SqlError.SqlError> =>
  Effect.fail(
    openError(
      new Error("No in-process SQLite in workerd; pass a Durable Object's ctx.storage.sql instead"),
      `Failed to open ${target}`,
    ),
  );

/** Fails: workerd has no in-process SQLite; a Durable Object's `ctx.storage.sql` is the database. */
export const makeMemory = (): Effect.Effect<Database, SqlError.SqlError> => unavailable(':memory:');

/** Fails: workerd has no in-process SQLite; a Durable Object's `ctx.storage.sql` is the database. */
export const makeFile = (path: string): Effect.Effect<Database, SqlError.SqlError> => unavailable(path);
