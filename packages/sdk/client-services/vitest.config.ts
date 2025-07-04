//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname, nodeExternal: true }),
  defineConfig({
    test: {
      // TODO(dmaretskyi): Enabled because client tests were flaky. Remove when that's not the case.
      retry: 2,
    },
  }),
);
