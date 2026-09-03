//
// Copyright 2025 DXOS.org
//

// Deliberately no `export * from '@effect/sql-sqlite-wasm'` — its three namespaces are all
// re-declared below from local modules, and the star form would re-admit the upstream
// `SqliteMigrator` that `./SqliteMigrator` exists to narrow.
export * as OpfsPool from './OpfsPool';
export * as OpfsWorker from './OpfsWorker';
export * as SqlExport from './SqlExport';
export * as SqlMigrations from './SqlMigrations';
export * as SqliteClient from './SqliteClient';
export * as SqliteMigrator from './SqliteMigrator';
export * as SqlTransaction from './SqlTransaction';
