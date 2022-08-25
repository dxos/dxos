//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import RollupNodeGlobalsPlugin from 'rollup-plugin-polyfill-node';
import { defineConfig, Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from '@dxos/config/esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from '@dxos/config/rollup-plugin';
import { NodeGlobalsPolyfillPlugin as EsbuildNodeGlobalsPlugin } from '@dxos/esbuild-plugins';

// TODO(wittjosiah): Factor out.
const dxosPlugin = (): Plugin => ({
  name: 'dxos',
  config: () => ({
    // TODO(wittjosiah): This shouldn't be required.
    resolve: {
      alias: {
        'node:assert': 'assert/',
        'node:util': 'util/'
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          EsbuildNodeGlobalsPlugin(),
          EsbuildConfigPlugin(),
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
          RollupConfigPlugin(),
          // TODO(wittjosiah): Is there a better way to do this? Can we eliminate setImmediate usage?
          {
            name: 'setimmediate-polyfill',
            transform (code, module) {
              const contents = 'import "setimmediate";';
              if (this.getModuleInfo(module).isEntry) {
                return contents + code;
              }
            }
          }
        ]
      }
    }
  })
});

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-toolkit',
      '@dxos/util'
    ]
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Why must org scope be omitted for this to work?
      // https://github.com/vitejs/vite/issues/5668#issuecomment-968125763
      include: [
        /client/,
        /config/,
        /protocols/,
        /react-async/,
        /react-client/,
        /react-components/,
        /react-toolkit/,
        /util/,
        /node_modules/
      ]
    }
  },
  plugins: [react(), dxosPlugin()]
});
