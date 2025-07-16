//
// Copyright 2022 DXOS.org
//

import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react-swc';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem',
          }
        : undefined,
    fs: {
      strict: false,
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    outDir: 'out/todomvc',
    // TODO(wittjosiah): Minification is causing issues with the app.
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dxos: ['@dxos/react-client'],
        },
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
      env: ['DX_VAULT'],
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    ReactPlugin({
      tsDecorators: true,
      plugins: [
        // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
        ['@preact-signals/safe-react/swc', { mode: 'all' }],
      ],
    }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: 'dxos',
      project: 'todomvc',
      sourcemaps: {
        assets: './packages/apps/todomvc/out/todomvc/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      disable: process.env.DX_ENVIRONMENT !== 'production',
    }),
    // https://www.bundle-buddy.com/rollup
    {
      name: 'bundle-buddy',
      buildEnd() {
        const deps: { source: string; target: string }[] = [];
        for (const id of this.getModuleIds()) {
          const m = this.getModuleInfo(id);
          if (m != null && !m.isExternal) {
            for (const target of m.importedIds) {
              deps.push({ source: m.id, target });
            }
          }
        }

        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
});
