//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from './esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from './rollup-plugin';

export const ConfigPlugin = (): Plugin => ({
  name: 'dxos-config',
  config: ({ root }) => {
    const configPath = root && resolve(root, 'dx.yml');
    const envPath = root && resolve(root, 'dx-env.yml');
    const devPath = root && resolve(root, 'dx-dev.yml');

    return {
      optimizeDeps: {
        esbuildOptions: {
          plugins: [EsbuildConfigPlugin({ configPath, envPath, devPath })]
        }
      },
      build: {
        rollupOptions: {
          plugins: [RollupConfigPlugin({ configPath, envPath, devPath })]
        }
      }
    };
  }
});
