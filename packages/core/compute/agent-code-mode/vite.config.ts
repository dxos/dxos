//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Its own output because a worker is started from a real file: the bundle that contains this
    // module cannot also be the module the worker loads.
    WorkerSandboxEntry: 'src/WorkerSandboxEntry.ts',
    WorkerSandboxBrowserEntry: 'src/WorkerSandboxBrowserEntry.ts',
  },
  test: {
    node: true,
    // The Web Worker path Composer runs; the rest of the suite is node or workerd only.
    browser: {
      browsers: ['chromium'],
      include: ['**/src/**/*.browser.test.ts'],
      // Pulled in by the worker entry, so vite only discovers them once the worker boots.
      optimizeDeps: ['@effect/platform-browser/BrowserWorker', 'effect/Data', 'effect/unstable/rpc/RpcClient'],
    },
    workerd: {
      // Dynamic isolate loading is what `WorkerdSandbox` is built on, and the binding exists only
      // where it is declared.
      compatibilityFlags: ['nodejs_compat', 'experimental'],
      miniflare: { workerLoaders: { LOADER: {} } },
      // `SELF` dispatches here, and a sandboxed isolate's outbound fetch is pointed at `SELF`.
      main: 'src/WorkerdHostWorker.ts',
    },
  },
});
