//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.shared';

export default mergeConfig(
  baseConfig(),
  defineConfig({
    test: {
      // TODO(dmaretskyi): Enabled because client tests were flaky. Remove when that's not the case.
      retry: 2,
    },
  }),
);
