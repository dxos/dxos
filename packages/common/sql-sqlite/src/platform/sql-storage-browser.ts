//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlError from 'effect/sql/SqlError';

import { type Database, openError } from '../internal/sql-storage.ts';
import { instantiateSqliteModule } from '../internal/sqlite-module.ts';
import { type Sqlite3, openMemory } from '../internal/wa-sqlite-storage.ts';

export type { Cursor, Database, Storage, Value } from '../internal/sql-storage.ts';

type Loaded = { readonly sqlite3: Sqlite3; readonly sqliteRow: number };

let loaded: Loaded | undefined;

// Imported on first use so wa-sqlite never enters an importer's static (boot) graph.
const load: Effect.Effect<Loaded, SqlError.SqlError> = Effect.suspend(() =>
  loaded
    ? Effect.succeed(loaded)
    : Effect.tryPromise({
        try: async () => {
          const [{ Factory, SQLITE_ROW }, { default: factory }] = await Promise.all([
            import('@effect/wa-sqlite'),
            // oxlint-disable-next-line @dxos/rules/effect-subpath-imports
            import('@effect/wa-sqlite/dist/wa-sqlite.mjs'),
          ]);
          return { sqlite3: Factory(await instantiateSqliteModule(factory)), sqliteRow: SQLITE_ROW };
        },
        catch: (cause) => openError(cause, 'Failed to load wa-sqlite'),
      }).pipe(Effect.map((sqlite) => (loaded ??= sqlite))),
);

/** Opens a {@link Database} over a fresh in-memory SQLite database (synchronous wa-sqlite build). */
export const makeMemory = (): Effect.Effect<Database, SqlError.SqlError> =>
  load.pipe(
    Effect.flatMap(({ sqlite3, sqliteRow }) =>
      Effect.try({
        try: () => openMemory(sqlite3, sqliteRow),
        catch: (cause) => openError(cause, 'Failed to open :memory:'),
      }),
    ),
  );

/** Files are not available in the browser; a persistent database lives in the OPFS worker. */
export const makeFile = (path: string): Effect.Effect<Database, SqlError.SqlError> =>
  Effect.fail(openError(new Error('SQLite files are not available in the browser'), `Failed to open ${path}`));
