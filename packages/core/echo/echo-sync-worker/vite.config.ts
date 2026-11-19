//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // The Worker entry `wrangler.jsonc` names; built here so it is checked like the rest.
    worker: 'src/worker.ts',
  },
  test: {
    // The end-to-end suite starts the real worker (wrangler, local workerd) and syncs node clients
    // through it over WebSockets.
    node: { timeout: 60_000 },
  },
});
