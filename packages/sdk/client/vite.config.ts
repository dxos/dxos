//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    devtools: 'src/devtools/index.ts',
    echo: 'src/echo/index.ts',
    halo: 'src/halo/index.ts',
    edge: 'src/edge/index.ts',
    index: 'src/index.ts',
    invitations: 'src/invitations/index.ts',
    mesh: 'src/mesh/index.ts',
    testing: 'src/testing/index.ts',
    worker: 'src/worker/index.ts',
    'worker/opfs-worker': 'src/worker/opfs-worker.ts',
    'services/dedicated/dedicated-worker-entrypoint': 'src/services/dedicated/dedicated-worker-entrypoint.ts',
    'services/dedicated/coordinator-worker-entrypoint': 'src/services/dedicated/coordinator-worker-entrypoint.ts',
    'services/dedicated/coordinator-worker': 'src/services/dedicated/coordinator-worker.ts',
  },
  test: { node: true },
});
