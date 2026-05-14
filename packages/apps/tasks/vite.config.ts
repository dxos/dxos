//
// Copyright 2026 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';

// Aligned with composer-app. These targets support top-level await natively,
// so no `vite-plugin-top-level-await` polyfill is needed.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  server: {
    host: true,
    fs: {
      strict: false,
    },
  },
  oxc: {
    target: [...browserTargets],
  },
  build: {
    // TODO(wittjosiah): Minification is causing issues with the app.
    minify: false,
    outDir: 'out/tasks',
    target: [...browserTargets],
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [WasmPlugin()],
  },
  plugins: [
    ShutdownPlugin(),
    ConfigPlugin({
      root: __dirname,
    }),
    WasmPlugin(),
    ReactPlugin(),
  ],
});
