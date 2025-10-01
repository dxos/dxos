//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  root: dirname,
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: '../../../key.pem',
            cert: '../../../cert.pem',
          }
        : false,
    fs: {
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  worker: {
    format: 'es',
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    ThemePlugin({
      root: dirname,
      content: [
        path.resolve(dirname, './index.html'),
        path.resolve(dirname, './src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
    TopLevelAwaitPlugin(),
    WasmPlugin(),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),
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

        const outDir = path.join(dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
  ...createTestConfig({ dirname, node: true, storybook: true }),
});
