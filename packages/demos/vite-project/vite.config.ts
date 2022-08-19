import { defineConfig } from 'vite'
import { NodeGlobalsPolyfillPlugin } from '@dxos/esbuild-plugins';
import react from '@vitejs/plugin-react'
import nodePolyfills from 'rollup-plugin-polyfill-node';

// https://vitejs.dev/config/
export default defineConfig({
  // TODO(wittjosiah): This shouldn't be required.
  resolve: {
    alias: {
      'node:util': 'util/'
    },
  },
  optimizeDeps: {
    include: ['@dxos/client', '@dxos/protocols'],
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin()
      ]
    }
  },
  build: {
    commonjsOptions: {
      // TODO(wittjosiah): Why must org scope be omitted for this to work?
      // https://github.com/vitejs/vite/issues/5668#issuecomment-968125763
      include: [/client/, /protocols/, /node_modules/]
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
})
