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
    workerd: {
      // The object (`@dxos/echo-sync-worker`) is the seq authority for a graph and reads its cap off its own
      // SQLite, so the tests run against a real Durable Object rather than a stand-in.
      main: 'src/worker/testing/space-worker.ts',
      miniflare: {
        durableObjects: { SPACE: { className: 'SpaceObject', useSQLite: true } },
      },
    },
  },
});
