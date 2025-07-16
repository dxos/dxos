//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

// TODO(wittjosiah): Factor out to shared config as an option.
const specifiedEnv = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const environment = specifiedEnv === 'node' ? 'jsdom' : undefined;

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    test: {
      environment,
      // TODO(dmaretskyi): Enabled because client tests were flaky. Remove when that's not the case.
      retry: 2,
    },
  }),
);
