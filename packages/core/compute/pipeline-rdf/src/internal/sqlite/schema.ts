//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

/** Create the triple store, entity, and cursor tables (idempotent). */
export const migrate = (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`CREATE TABLE IF NOT EXISTS triples (
      s TEXT NOT NULL, p TEXT NOT NULL, o TEXT NOT NULL,
      oType TEXT NOT NULL, g TEXT NOT NULL DEFAULT ''
    )`;
    yield* sql`CREATE UNIQUE INDEX IF NOT EXISTS triples_unique ON triples (s, p, o, oType, g)`;
    yield* sql`CREATE INDEX IF NOT EXISTS triples_spo ON triples (s, p, o)`;
    yield* sql`CREATE INDEX IF NOT EXISTS triples_pos ON triples (p, o)`;
    yield* sql`CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL,
      aliases TEXT NOT NULL DEFAULT '[]', ref TEXT
    )`;
    yield* sql`CREATE TABLE IF NOT EXISTS cursors (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`;
  });
