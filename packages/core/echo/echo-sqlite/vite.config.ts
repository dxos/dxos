//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  // Both `@dxos/sql-sqlite` and `@effect/sql-sqlite-wasm` import the upstream wa-sqlite; the DXOS
  // fork is the one whose VFS the OPFS worker builds on, so everything resolves to it.
  alias: { '@effect/wa-sqlite': '@dxos/wa-sqlite' },
  test: {
    node: true,
    browser: {
      browsers: ['chromium'],
      // Reached only through the OPFS worker, so vite discovers them once the worker boots.
      optimizeDeps: ['effect/Deferred', 'effect/Fiber', 'effect/Option'],
    },
  },
});
