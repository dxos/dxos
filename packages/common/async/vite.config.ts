//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Node-only (extends `node:stream` Duplex) — kept out of the browser-reachable main barrel.
    testing: 'src/test-stream.ts',
  },
  test: { node: true },
});
