//
// Copyright 2025 DXOS.org
//

// Deliberately no `export * from '@effect/sql-sqlite-wasm'` — its three namespaces are all
// re-declared below from local modules, and the star form would re-admit the upstream
// `SqliteMigrator` that `./SqliteMigrator` exists to narrow.
export * as OpfsPool from './OpfsPool.ts';
export * as OpfsWorker from './OpfsWorker.ts';
export * as SqlMigrations from './SqlMigrations.ts';
export * as SqliteClient from './SqliteClient.ts';
export * as SqliteMigrator from './SqliteMigrator.ts';
export * as SqlTransaction from './SqlTransaction.ts';
