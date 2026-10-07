//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';

import init from './0001_init.sql?raw';

/**
 * Migrations keyed `<id>_<name>` as `Migrator.fromRecord` expects.
 * Ids must only ever increase, and an applied migration must never be edited.
 */
export const MIGRATIONS = {
  '0001_init': Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql.unsafe(init);
  }),
};

/** Own history table, since the service shares its database with other stores. */
export const MIGRATIONS_TABLE = 'dx_sqlite_service_migrations';
