//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.shared';

export default mergeConfig(
  baseConfig({ cwd: __dirname, nodeExternal: true }),
  defineConfig({
    test: {
      testTimeout: 60_000,
    },
  }),
);