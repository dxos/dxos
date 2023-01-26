//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from './esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from './rollup-plugin';
import { ConfigPluginOpts } from './types';

export const ConfigPlugin = (options: ConfigPluginOpts = {}): Plugin => ({
  name: 'dxos-config',
  config: ({ root }) => {
    const configPath = root && resolve(root, options.configPath ?? 'dx.yml');
    const envPath = root && resolve(root, options.envPath ?? 'dx-env.yml');
    const devPath = root && resolve(root, options.devPath ?? 'dx-dev.yml');

    return {
      optimizeDeps: {
        esbuildOptions: {
          plugins: [EsbuildConfigPlugin({ ...options, configPath, envPath, devPath })]
        }
      },
      build: {
        rollupOptions: {
          plugins: [RollupConfigPlugin({ ...options, configPath, envPath, devPath })]
        }
      }
    };
  }
});
