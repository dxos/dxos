//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.shared';

export default mergeConfig(baseConfig(), defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  }
}));
