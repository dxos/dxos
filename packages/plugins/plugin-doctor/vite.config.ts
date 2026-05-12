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
    blueprints: 'src/blueprints/index.ts',
    diagnostics: 'src/diagnostics/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: createTestConfig({ dirname, node: { environment: 'happy-dom' } }),
});
