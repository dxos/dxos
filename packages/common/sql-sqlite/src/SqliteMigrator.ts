//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';

// Named re-exports, and `run`/`layer` restated rather than taken from
// `@effect/sql-sqlite-wasm/SqliteMigrator`: both that module and Effect 4's `Migrator` are reached
// through `export *`, which materializes the whole namespace and so retains `fromFileSystem`. Its
// `import(`${directory}/${basename}`)` is a specifier no static module loader can resolve, and
// workerd rejects the entire bundle over it (ERR_MODULE_DYNAMIC_SPEC). Effect 3 kept
// `fromFileSystem` in a separate `Migrator/FileSystem` module, which is why the star form was
// previously harmless. Nothing is lost: this is the wasm/OPFS client, with no filesystem to read.
export { MigrationError, fromBabelGlob, fromGlob, fromRecord, make } from 'effect/unstable/sql/Migrator';
export type { Migration, MigratorOptions, ResolvedMigration } from 'effect/unstable/sql/Migrator';

/** Runs ordered migrations through the ambient `SqlClient`. */
export const run = Migrator.make({});

/** Runs the configured migrations during layer construction, providing no services. */
export const layer = <R>(options: Migrator.MigratorOptions<R>) => Layer.effectDiscard(run(options));
