//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineProject, defineConfig } from 'vitest/config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Vitest project (does not use repo `vitest.base.config` — that pulls DXOS Vite plugins
 * that are not resolvable as config dependencies from this package).
 */
export default defineConfig({
  root: dirname,
  test: {
    projects: [
      defineProject({
        root: dirname,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      }),
    ],
  },
});
