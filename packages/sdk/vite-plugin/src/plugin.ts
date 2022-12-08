//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import RollupNodeGlobalsPlugin from 'rollup-plugin-polyfill-node';
import { Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from '@dxos/config/esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from '@dxos/config/rollup-plugin';
import {
  NodeModulesPlugin as EsbuildNodeModulesPlugin,
  NodeGlobalsPolyfillPlugin as EsbuildNodeGlobalsPlugin
} from '@dxos/esbuild-plugins';

const env = (value?: string) => (value ? `"${value}"` : undefined);

export const dxosPlugin = (): Plugin => ({
  name: 'dxos',
  config: ({ root }) => {
    const configPath = root && resolve(root, 'dx.yml');
    const envPath = root && resolve(root, 'dx-env.yml');
    const devPath = root && resolve(root, 'dx-dev.yml');

    return {
      define: {
        'process.env.LOG_FILTER': env(process.env.LOG_FILTER),
        'process.env.LOG_BROWSER_PREFIX': env(process.env.LOG_BROWSER_PREFIX)
      },
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            EsbuildNodeModulesPlugin(),
            EsbuildNodeGlobalsPlugin(),
            EsbuildConfigPlugin({ configPath, envPath, devPath })
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
    };
  }
});
