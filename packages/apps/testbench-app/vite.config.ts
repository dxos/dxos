//
// Copyright 2022 DXOS.org
//

// import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { UserConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    cors: true,
    // Set isolation to enable performance.measureUserAgentSpecificMemory
    // https://web.dev/articles/coop-coep
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
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
        //  https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    sourcemap: true,
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
          ui: ['@dxos/react-ui', '@dxos/react-ui-theme'],
          editor: ['@dxos/react-ui-editor'],
        },
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    tsconfigPaths({
      projects: ['../../../tsconfig.paths.json'],
    }),
    ConfigPlugin({
      env: ['DX_VAULT', 'BASELIME_API_KEY'],
    }),
    ThemePlugin({
      root: __dirname,
      content: [resolve(__dirname, './index.html'), resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),
    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    // sentryVitePlugin({
    //   org: 'dxos',
    //   project: 'testbench-app',
    //   sourcemaps: {
    //     assets: './packages/apps/testbench-app/out/testbench-app/**',
    //   },
    //   authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
    //   disable: process.env.DX_ENVIRONMENT !== 'production',
    // }),
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
} as UserConfig);
