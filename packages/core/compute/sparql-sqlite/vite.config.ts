//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Its own entry, so a host on synchronous SQLite (a Durable Object) never loads `effect/sql`.
    async: 'src/async.ts',
    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
