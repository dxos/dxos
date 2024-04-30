//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../../../vitest.shared';

export default mergeConfig(
  configShared,
  defineConfig({
    test: {
      // libdatachannel hard crashes otherwise.
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },

      globalSetup: [require.resolve('packages/core/mesh/signal/testing/setup-vitest.js')],
    },
  }),
);
