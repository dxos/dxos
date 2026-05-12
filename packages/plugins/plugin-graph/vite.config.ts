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
    index: 'src/index.ts',
    plugin: 'src/plugin.ts',
  },
  jsx: 'react',
  test: createTestConfig({ dirname, node: { environment: 'happy-dom' } }),
});
