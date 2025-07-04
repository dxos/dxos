//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    // test: {
    //   retry: 2,
    // },
  }),
);
