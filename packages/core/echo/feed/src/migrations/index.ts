//
// Copyright 2026 DXOS.org
//

import { type SqlMigrator } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/**
 * Feed store migrations, in application order.
 *
 * Listed explicitly rather than globbed so that ids and ordering are reviewable in a diff, and
 * so a bundler cannot change what ships. Ids are permanent: the migrator advances a high-water
 * mark, so a new migration must take the next unused id and an applied one must never be edited.
 */
export const MIGRATIONS: ReadonlyArray<SqlMigrator.Migration> = [{ id: 1, name: 'init', sql: init }];

/**
 * Separate history per store, since several packages share one physical database.
 */
export const MIGRATIONS_TABLE = 'feed_migrations';
