import { ConfigPlugin } from '@dxos/config/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react-swc';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  server: {
    host: true,
    fs: {
      strict: false,
    },
  },
  build: {
    // TODO(wittjosiah): Minification is causing issues with the app.
    minify: false,
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
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    ConfigPlugin({
      root: __dirname,
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    ReactPlugin({
      tsDecorators: true,
    }),
  ],
});
