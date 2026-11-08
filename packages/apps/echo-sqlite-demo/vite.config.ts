//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import path from 'node:path';
import { type PluginOption, defineConfig, searchForWorkspaceRoot } from 'vite';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';

const dirname = import.meta.dirname;
const rootDir = searchForWorkspaceRoot(process.cwd());

// All of these run top-level await, which the wa-sqlite glue relies on.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

/** Shared by the page and the OPFS worker, which resolve the same `@dxos/*` sources. */
const sharedPlugins = (): PluginOption[] => [importSource({ include: ['@dxos/**'] }), DxosLogPlugin(), wasm()];

export default defineConfig({
  root: dirname,
  server: {
    host: true,
    fs: { allow: [rootDir] },
  },
  oxc: {
    target: [...browserTargets],
  },
  build: {
    outDir: 'out/echo-sqlite-demo',
    sourcemap: true,
    target: [...browserTargets],
  },
  optimizeDeps: {
    // Pre-bundling the wasm breaks its glue; vite must leave it alone.
    exclude: ['@dxos/wa-sqlite'],
  },
  resolve: {
    alias: [
      { find: /^(node:)?util$/, replacement: '@dxos/node-std/util' },
      { find: /^(node:)?path$/, replacement: '@dxos/node-std/path' },
      { find: /^(node:)?crypto$/, replacement: '@dxos/node-std/crypto' },
      { find: /^(node:)?stream$/, replacement: '@dxos/node-std/stream' },
    ],
  },
  worker: {
    format: 'es',
    plugins: () => sharedPlugins(),
  },
  plugins: [
    ...sharedPlugins(),
    react({ include: /\.[jt]sx$/, exclude: [/\/node_modules\//] }),
    // `@dxos/react-ui` components and `graph.css` are Tailwind sources, so the theme has to be
    // compiled. Sources resolve from src (vite-plugin-import-source), so scan src rather than dist.
    ThemePlugin({
      content: [
        path.join(rootDir, 'packages/ui/react-ui/src/**/*.{ts,tsx}'),
        path.join(rootDir, 'packages/ui/react-ui-list/src/**/*.{ts,tsx}'),
        path.join(rootDir, 'packages/ui/react-ui-form/src/**/*.{ts,tsx}'),
        path.join(rootDir, 'packages/ui/react-ui-graph/src/**/*.{ts,tsx}'),
      ],
    }),
  ],
});
