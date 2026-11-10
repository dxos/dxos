//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    protocol: 'src/protocol.ts',
    // The Worker entry `wrangler.jsonc` names; built here so it is checked like the rest.
    worker: 'src/worker.ts',
  },
});
