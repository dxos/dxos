//
// Copyright 2025 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from '../../../vitest.shared';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({})
);
