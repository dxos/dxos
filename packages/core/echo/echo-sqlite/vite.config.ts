//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  test: {
    node: true,
    browser: {
      browsers: ['chromium'],
      // The default include is every test file bar `*.node.test.ts`, and this package's node suites
      // are plain `*.test.ts` (they use `node:fs` and `node:crypto`), so name the browser ones.
      include: ['**/src/**/*.browser.test.{ts,tsx}'],
      // Reached only through the OPFS worker, so vite discovers them once the worker boots.
      optimizeDeps: ['effect/Deferred', 'effect/Fiber', 'effect/Option'],
    },
    // The workerd project is OFF while its pool failure is unresolved: it dies before any module
    // loads, so even a test importing only `vitest` fails to collect. The node project already
    // excludes `*.workerd.test.ts`, so the three parked files sit in the tree uncollected. Reasons
    // and the ruled-out list: `src/testing/load.workerd.test.ts`, and TASKS.md risk 10.
    // workerd: true,
  },
});
