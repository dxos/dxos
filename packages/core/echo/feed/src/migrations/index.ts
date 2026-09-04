//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import blockEncryption from './0002_block_encryption.sql?raw';
import syncStateServerToken from './0003_sync_state_server_token.sql?raw';

/**
 * Feed store migrations, keyed `<id>_<name>` as `@effect/sql`'s `Migrator.fromRecord` expects.
 *
 * Listed explicitly rather than globbed so ids and ordering are reviewable in a diff, and so a
 * bundler cannot change what ships. Each value executes its raw `.sql`, splitting it into statements
 * because SQLite prepares one at a time.
 *
 * Ids are permanent and must only ever increase: the migrator applies everything above the highest
 * recorded id, so a migration numbered at or below one that has shipped is skipped for good. An
 * applied migration must never be edited either — nothing verifies its contents.
 */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_block_encryption': SqlMigrations.apply(blockEncryption),
  '0003_sync_state_server_token': SqlMigrations.apply(syncStateServerToken),
};

/**
 * Separate history per store, since several packages share one physical database.
 */
export const MIGRATIONS_TABLE = 'feed_migrations';
