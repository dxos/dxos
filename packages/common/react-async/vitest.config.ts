//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../../vitest.shared';

// TODO(wittjosiah): Factor out to shared config as an option.
const specifiedEnv = (process.env.VITEST_ENV ?? 'node').toLowerCase();
const environment = specifiedEnv === 'node' ? 'jsdom' : undefined;

export default mergeConfig(
  configShared,
  defineConfig({
    optimizeDeps: {
      include: ['raf/polyfill', 'react', 'react-dom/client', 'react-dom/test-utils'],
    },
    test: {
      environment,
    },
  }),
);
