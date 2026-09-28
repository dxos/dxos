//
// Copyright 2026 DXOS.org
//

import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';
import documentCopy from './0002_document_copy.sql?raw';

export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
  '0002_document_copy': SqlMigrations.apply(documentCopy),
};

/** Own history table per store, since many stores share the client database. */
export const MIGRATIONS_TABLE = 'object_snapshot_migrations';
