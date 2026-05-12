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
    'platform/browser': 'src/platform/browser/index.ts',
    'platform/node': 'src/platform/node/index.ts',
    'processors/console-stub': 'src/processors/console-stub.ts',
    'processors/console-processor': 'src/processors/console-processor.ts',
  },
  test: createTestConfig({ dirname, node: true }),
});
