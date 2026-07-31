//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import WasmPlugin from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Aligned with composer-app. These targets support top-level await natively,
// so no `vite-plugin-top-level-await` polyfill is needed.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

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
  oxc: {
    target: [...browserTargets],
  },
  build: {
    sourcemap: true,
    target: [...browserTargets],
  },
  resolve: {
    // NOTE: Under Vite 8 / rolldown, string-keyed aliases are treated as prefix matches, so
    // `tiktoken/lite` must use the regex form to avoid also matching deeper subpaths.
    alias: [
      { find: /^node-fetch$/, replacement: 'isomorphic-fetch' },
      { find: /^tiktoken\/lite$/, replacement: path.resolve(dirname, 'stub.mjs') },
    ],
  },
  worker: {
    format: 'es',
    plugins: () => [WasmPlugin()],
  },
  plugins: [
    ThemePlugin({}),
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
