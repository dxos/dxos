//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esmExternalRequirePlugin } from 'rolldown/plugins';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

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
        '@dxos/echo/internal',
        '@dxos/echo-client',
        '@dxos/protocols',
        '@dxos/react-client',
        '@dxos/react-client/echo',
        '@dxos/react-client/halo',
        '@dxos/react-client/mesh',
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'scheduler',
        'use-sync-external-store',
        /^use-sync-external-store\//,
      ],
      plugins: [
        // Convert literal `require("X")` calls (including those rolldown
        // emits inside its `__commonJSMin`-wrapped transitive CJS deps —
        // react-jsx-runtime/cjs, use-sync-external-store, react-dom/cjs)
        // into ESM imports against the consumer's resolution of these deps.
        // Each subpath must be listed independently (rolldown/rolldown#8349);
        // entries must also appear in top-level `external` with
        // `skipDuplicateCheck: true` to silence the duplicate warning, per
        // the maintainer-provided working repro at vite8-external-20260216.
        esmExternalRequirePlugin({
          external: [
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            'scheduler',
            'use-sync-external-store',
            /^use-sync-external-store\//,
          ],
          skipDuplicateCheck: true,
        }),
      ],
    },
  },
  plugins: [
    ThemePlugin({}),
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

        const outDir = path.join(dirname, 'dist/bundle');
        if (!existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true });
        }
        writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
});
