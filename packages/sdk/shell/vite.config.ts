//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
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
        '@phosphor-icons/react',
        // TODO(wittjosiah): React still being included.
        'react',
        'react-dom',
      ],
    },
  },
  plugins: [
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-theme/dist/**/*.mjs'),
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

        const outDir = join(__dirname, 'dist/bundle');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
});
