//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, defineProject } from 'vitest/config';

import { TEST_TAGS } from '../../vitest.tags.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Standalone: the server tests need none of the DXOS Vite plugins `vitest.base.config` installs. */
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
        },
      }),
    ],
  },
});
