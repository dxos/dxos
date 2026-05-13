//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    devtools: 'src/devtools/index.ts',
    echo: 'src/echo/index.ts',
    halo: 'src/halo/index.ts',
    index: 'src/index.ts',
    invitations: 'src/invitations/index.ts',
    mesh: 'src/mesh/index.ts',
    testing: 'src/testing/index.ts',
    worker: 'src/worker.ts',
  },
  jsx: 'react',
  test: { node: { environment: 'happy-dom' }, storybook: true },
});
