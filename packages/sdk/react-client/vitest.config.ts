//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.shared';

// TODO(wittjosiah): Factor out to shared config as an option.
const specifiedEnv = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const environment = specifiedEnv === 'node' ? 'jsdom' : undefined;

export default mergeConfig(
  baseConfig(),
  defineConfig({
    test: {
      environment,
    },
  }),
);
