//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/unstable/sql/Migrator';

// Named re-exports (not `export *`, which would retain `fromFileSystem`, whose dynamic
// template-literal `import()` workerd rejects bundle-wide — ERR_MODULE_DYNAMIC_SPEC); nothing is
// lost, as this is the wasm/OPFS client, with no filesystem to read.
export { MigrationError, fromBabelGlob, fromGlob, fromRecord, make } from 'effect/unstable/sql/Migrator';
export type { Migration, MigratorOptions, ResolvedMigration } from 'effect/unstable/sql/Migrator';

/** Runs ordered migrations through the ambient `SqlClient`. */
export const run = Migrator.make({});

/** Runs the configured migrations during layer construction, providing no services. */
export const layer = <R>(options: Migrator.MigratorOptions<R>) => Layer.effectDiscard(run(options));
