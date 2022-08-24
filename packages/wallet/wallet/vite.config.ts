//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/esbuild-plugin';
import { NodeGlobalsPolyfillPlugin } from '@dxos/esbuild-plugins';

// https://vitejs.dev/config/
export default defineConfig({
  // TODO(wittjosiah): This shouldn't be required.
  resolve: {
    alias: {
      'node:assert': 'assert/',
      'node:util': 'util/'
    }
  },
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
    ],
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin(),
        ConfigPlugin(),
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
    },
    rollupOptions: {
      plugins: [
        // `null` targets all source code files.
        // https://github.com/FredKSchott/rollup-plugin-polyfill-node#options
        // TODO(wittjosiah): Specifically target our deps?
        nodePolyfills({ include: null })
      ]
    }
  },
  plugins: [react()]
});
