//
// Copyright 2026 DXOS.org
//

import { type Plugin, defineConfig } from 'vite';

import PluginImportSource from '@dxos/vite-plugin-import-source';

// Node built-ins that `@dxos/node-std` actually implements for the browser. Duplicated from the
// workspace vite config rather than imported: that config is a vitest config factory, and loading it
// here would pull the whole test harness into a plain dev server.
const NODE_STD_MODULES = [
  'fs/promises',
  'assert',
  'buffer',
  'crypto',
  'events',
  'fs',
  'path',
  'process',
  'stream',
  'util',
];

/**
 * Redirects node built-ins to their `@dxos/node-std` browser equivalents. Without it vite
 * externalizes them to a stub and the harness dies on first use (`@dxos/util` imports `node:util`).
 */
const nodeStdResolvePlugin = (): Plugin => ({
  name: 'node-std',
  resolveId: {
    order: 'pre',
    async handler(source, importer, options) {
      const moduleName = source.startsWith('node:') ? source.slice('node:'.length) : source;
      if (NODE_STD_MODULES.includes(moduleName)) {
        return this.resolve(`@dxos/node-std/${moduleName}`, importer, options);
      }
    },
  },
});

/**
 * Minimal dev server for the stress harness page. Deliberately NOT Storybook: the harness needs no
 * React, theme, or design-system assets, and Storybook's static-asset preset requires unrelated
 * packages' build output — a heavy prerequisite for a page that is one `<pre>` and a module script.
 */
export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    nodeStdResolvePlugin(),
    // Resolve `@dxos/*` to their `source` export so the suite exercises src, not stale `dist/`.
    PluginImportSource({ include: ['@dxos/**', '#*'] }),
  ],
  server: { strictPort: true },
});
