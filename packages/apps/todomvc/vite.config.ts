//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';

// Aligned with composer-app. These targets support top-level await natively,
// so no `vite-plugin-top-level-await` polyfill is needed.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  optimizeDeps: {
    // Avoid prebundling wa-sqlite into .vite/deps where the adjacent wasm file is not emitted.
    // Keeping it as a normal node_modules module preserves import.meta.url-based wasm resolution.
    exclude: ['@effect/sql-sqlite-wasm', '@dxos/wa-sqlite'],
  },
  resolve: {
    // Ensure a single React instance across the main page and the shell.html
    // iframe (the latter loads the prebuilt @dxos/shell bundle which inlines
    // its own React for rolldown CJS-interop reasons). Without dedupe, hooks
    // throw "Cannot read properties of null (reading 'useState')".
    dedupe: ['react', 'react-dom'],
  },
  oxc: {
    target: [...browserTargets],
  },
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: '../../../key.pem',
            cert: '../../../cert.pem',
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
    target: [...browserTargets],
    // TODO(wittjosiah): Minification is causing issues with the app.
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
      // Note: the previous `manualChunks` split that pulled react/react-dom/
      // react-router-dom into a `react` chunk caused rolldown to emit
      // `require("react")` calls in the shell entry (cross-chunk CJS interop),
      // which fail at runtime in the browser. Letting rolldown chunk
      // automatically keeps everything ESM.
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
      env: ['DX_VAULT'],
    }),
    WasmPlugin(),
    ReactPlugin(),
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
