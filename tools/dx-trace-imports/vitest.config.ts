//
// Copyright 2026 DXOS.org
//

import { defineConfig, defineProject } from 'vitest/config';

import { TEST_TAGS } from '../../vitest.tags.ts';

/** Standalone Vitest project: the tests run the built CLI, so they need none of the repo's vite plugins. */
export default defineConfig({
  root: import.meta.dirname,
  test: {
    tags: TEST_TAGS,
    projects: [
      defineProject({
        root: import.meta.dirname,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      }),
    ],
  },
});
