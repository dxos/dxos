//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../../../vitest.shared';

export default mergeConfig(
  configShared,
  defineConfig({
    test: {
      globalSetup: [require.resolve('packages/core/mesh/signal/testing/setup-vitest.js')],
    },
  }),
);
