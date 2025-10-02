//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  root: dirname,
  build: {
    outDir: 'dist/bundle',
    sourcemap: true,
    lib: {
      entry: path.resolve(dirname, 'src/index.ts'),
      name: 'Shell',
      fileName: 'shell',
    },
    rollupOptions: {
      external: [
        '@dxos/client',
        '@dxos/client/echo',
        '@dxos/client/halo',
        '@dxos/client/mesh',
        '@dxos/client-protocol',
        '@dxos/client-services',
        '@dxos/echo-schema',
        '@dxos/echo-db',
        '@dxos/protocols',
        '@dxos/react-client',
        '@dxos/react-client/echo',
        '@dxos/react-client/halo',
        '@dxos/react-client/mesh',
        // TODO(wittjosiah): React still being included.
        'react',
        'react-dom',
      ],
    },
  },
  plugins: [
    ThemePlugin({
      root: dirname,
      content: [
        path.resolve(dirname, './src/**/*.{js,ts,jsx,tsx}'),
        path.resolve(dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        path.resolve(dirname, './node_modules/@dxos/react-ui-theme/dist/**/*.mjs'),
      ],
    }),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),
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

        const outDir = path.join(dirname, 'dist/bundle');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
  ...createTestConfig({ dirname, node: true, storybook: true }),
});
