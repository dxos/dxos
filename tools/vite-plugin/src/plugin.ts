//
// Copyright 2022 DXOS.org
//

import RollupNodeGlobalsPlugin from 'rollup-plugin-polyfill-node';
import { Plugin } from 'vite';

import { ConfigPlugin as EsbuildConfigPlugin } from '@dxos/config/esbuild-plugin';
import { ConfigPlugin as RollupConfigPlugin } from '@dxos/config/rollup-plugin';
import { NodeGlobalsPolyfillPlugin as EsbuildNodeGlobalsPlugin } from '@dxos/esbuild-plugins';

export const dxosPlugin = (configPath?: string): Plugin => ({
  name: 'dxos',
  config: () => ({
    // TODO(wittjosiah): This shouldn't be required.
    resolve: {
      alias: {
        'node:assert': 'assert/',
        'node:events': 'events/',
        'node:path': 'path-browserify/',
        'node:util': 'util/'
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          EsbuildNodeGlobalsPlugin(),
          EsbuildConfigPlugin({ configPath }),
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
          RollupConfigPlugin({ configPath }),
          // TODO(wittjosiah): Is there a better way to do this? Can we eliminate setImmediate usage?
          {
            name: 'setimmediate-polyfill',
            transform (code, module) {
              const contents = `import "${require.resolve('setimmediate')}";`;
              // eslint-disable-next-line
              // @ts-ignore
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
