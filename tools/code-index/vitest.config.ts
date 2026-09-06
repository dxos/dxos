//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, defineProject } from 'vitest/config';

import { TEST_TAGS } from '../../vitest.tags';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Standalone project: the repo base config pulls DXOS Vite plugins that this package does not depend on.
export default defineConfig({
  root: dirname,
  test: {
    tags: TEST_TAGS,
    projects: [
      defineProject({
        root: dirname,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          testTimeout: 30_000,
        },
      }),
    ],
  },
});
