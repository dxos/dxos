import { ConfigPlugin } from '@dxos/config/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

// https://vitejs.dev/config
export default defineConfig({
  server: {
    host: true,
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: 'out/tasks',
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      TopLevelAwaitPlugin(),
      WasmPlugin(),
    ],
  },
  plugins: [
    ConfigPlugin(),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    ReactPlugin({
      tsDecorators: true,
      plugins: [
        [
          '@preact-signals/safe-react/swc',
          {
            // you should use `auto` mode to track only components which uses `.value` access.
            // Can be useful to avoid tracking of server side components
            mode: 'all',
          },
        ],
      ],
    }),
  ],
});
