//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../../../vitest.shared';

console.log(require('process').cwd());

export default mergeConfig(
  configShared,
  defineConfig({
    root: 'packages/core/echo/automerge-index',
    test: {
      dir: 'packages/core/echo/automerge-index',
      root: 'packages/core/echo/automerge-index',
    },
  }),
);
