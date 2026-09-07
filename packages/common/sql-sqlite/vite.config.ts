//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    OpfsPool: 'src/OpfsPool.ts',
    OpfsWorker: 'src/OpfsWorker.ts',
    SqlExport: 'src/SqlExport.ts',
    SqlMigrations: 'src/SqlMigrations.ts',
    SqlTransaction: 'src/SqlTransaction.ts',
    SqliteClient: 'src/SqliteClient.ts',
    SqliteMigrator: 'src/SqliteMigrator.ts',
    'platform/browser': 'src/platform/browser.ts',
    'platform/bun': 'src/platform/bun.ts',
    'platform/node': 'src/platform/node.ts',
  },
  // Undeclared dep, reached only through this package — inlined rather than left for
  // consumers to resolve.
  bundle: ['@effect/sql-sqlite-wasm'],
  // Both this package and `@effect/sql-sqlite-wasm` import the upstream wa-sqlite; the DXOS
  // fork is the one whose VFS examples `OpfsWorker` builds on, so everything resolves to it.
  alias: { '@effect/wa-sqlite': '@dxos/wa-sqlite' },
  test: { node: {}, browser: 'chromium' },
});
