//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // The Durable Object, built apart from the client so a browser bundle never reaches it.
    worker: 'src/worker/index.ts',
  },
  test: {
    node: true,
    workerd: {
      // The object is the version authority for a graph, and its cap is read off its own SQLite, so
      // the tests run against a real Durable Object rather than a stand-in.
      main: 'src/worker/testing/space-worker.ts',
      miniflare: {
        durableObjects: { SPACE: { className: 'SpaceObject', useSQLite: true } },
      },
    },
  },
});
