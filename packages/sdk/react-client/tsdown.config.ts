// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: [
    'src/devtools/index.ts',
    'src/echo/index.ts',
    'src/halo/index.ts',
    'src/index.ts',
    'src/invitations/index.ts',
    'src/mesh/index.ts',
    'src/testing/index.ts',
    'src/worker.ts',
  ],
});
