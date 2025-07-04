//
// Copyright 2025 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    test: {
      globals: true,
      // environment: 'jsdom',
      setupFiles: [
        // './src/stories/test/vitest.setup.ts',
      ],
    },
  })
);
