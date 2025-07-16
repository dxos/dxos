//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.base.config';

// TODO(wittjosiah): Factor out to shared config as an option.
const env = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const environment = env === 'node' ? 'happy-dom' : undefined;

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    test: {
      environment,
      globals: true,
    },
  }),
);
