//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '../../../vite.base.config.ts';
import { createTestConfig } from '../../../vitest.base.config.ts';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

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
  test: createTestConfig({ dirname, node: { environment: 'happy-dom' } }),
});
