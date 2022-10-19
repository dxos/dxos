//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import RollupNodeGlobalsPlugin from 'rollup-plugin-polyfill-node';
import { Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from '@dxos/config/esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from '@dxos/config/rollup-plugin';
import { NodeGlobalsPolyfillPlugin as EsbuildNodeGlobalsPlugin } from '@dxos/esbuild-plugins';

export const dxosPlugin = (configDir?: string): Plugin => {
  const configPath = configDir && resolve(configDir, 'dx.yml');
  const envPath = configDir && resolve(configDir, 'dx-env.yml');
  const devPath = configDir && resolve(configDir, 'dx-dev.yml');

  return {
    name: 'dxos',
    config: () => ({
      // TODO(wittjosiah): This shouldn't be required.
      resolve: {
        alias: {
          'node:assert': 'assert/',
          'node:path': 'path-browserify/',
          'node:util': 'util/'
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            EsbuildNodeGlobalsPlugin(),
            EsbuildConfigPlugin({ configPath, envPath, devPath }),
            // TODO(wittjosiah): This shouldn't be required.
            {
              name: 'sodium-universal-patch',
              setup: build => {
                build.onResolve({ filter: /sodium-native/ }, args => {
                  return { path: require.resolve('sodium-javascript') };
                });
              }
            }
          ]
        }
      },
      build: {
        rollupOptions: {
          plugins: [
            // `null` targets all source code files.
            // https://github.com/FredKSchott/rollup-plugin-polyfill-node#options
            // TODO(wittjosiah): Specifically target our deps?
            RollupNodeGlobalsPlugin({ include: null }),
            RollupConfigPlugin({ configPath, envPath, devPath })
          ]
        }
      }
    })
  };
};
