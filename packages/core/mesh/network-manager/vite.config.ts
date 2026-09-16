//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'testing': 'src/testing/index.ts',
    'transport/tcp': 'src/transport/tcp/index.ts',
    'transport/tcp/tcp-transport': 'src/transport/tcp/tcp-transport.ts',
    'transport/tcp/tcp-transport.browser': 'src/transport/tcp/tcp-transport.browser.ts',
  },
  test: {
    node: true,
    // Only the `*.browser.test.ts` suites: the rest of the package's tests need `node-datachannel`
    // and other node-only APIs.
    browser: {
      browsers: ['chromium'],
      include: ['**/src/**/*.browser.test.ts'],
      // Pulled in by `rtc-proxy-worker.ts`, so vite only discovers them once the worker boots.
      optimizeDeps: ['@effect/platform-browser/BrowserWorker', 'effect/unstable/rpc/RpcClient'],
    },
  },
});
