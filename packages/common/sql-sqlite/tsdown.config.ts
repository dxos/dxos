// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ["src/index.ts","src/SqliteClient.ts","src/OpfsWorker.ts","src/SqliteMigrator.ts","src/SqlExport.ts","src/SqlTransaction.ts","src/platform/node.ts","src/platform/browser.ts","src/platform/bun.ts"],
  bundlePackages: ["@effect/sql-sqlite-wasm"],
});
