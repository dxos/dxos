//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import path from 'node:path';
import { type PluginOption, defineConfig, searchForWorkspaceRoot } from 'vite';
import wasm from 'vite-plugin-wasm';

import { pluginConfigPlugin } from '@dxos/app-framework/vite-plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ModuleUrlPlugin } from '@dxos/vite-plugin-module-url';

const dirname = import.meta.dirname;
const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');
const extendedIcons = path.join(rootDir, '/packages/ui/ui-icons/assets');

// Same targets as composer-app: all of them run top-level await, which the wasm glue relies on.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

const WORKER_ENTRIES: Record<string, string> = {
  '@dxos/client/dedicated-worker': 'packages/sdk/client/src/services/dedicated/dedicated-worker-entrypoint.ts',
  '@dxos/client/coordinator-worker': 'packages/sdk/client/src/services/dedicated/coordinator-worker-entrypoint.ts',
  '@dxos/react-ui-canvas/generator-worker': 'packages/ui/react-ui-canvas/src/generator/worker.ts',
};

/** Shared by the page and the client workers, which resolve the same `@dxos/*` sources. */
const sharedPlugins = (): PluginOption[] => [
  importSource({ include: ['@dxos/**', '#*'] }),
  DxosLogPlugin(),
  ModuleUrlPlugin(),
  wasm(),
];

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
    outDir: 'out/drawing-app',
    sourcemap: true,
    target: [...browserTargets],
  },
  optimizeDeps: {
    exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
  },
  resolve: {
    alias: [
      // Vite's worker transform resolves `new URL(<specifier>, import.meta.url)` through aliases only, not package exports.
      ...Object.entries(WORKER_ENTRIES).map(([find, source]) => ({ find, replacement: path.join(rootDir, source) })),
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
    // Replaces each plugin's `dx.config.ts` with its manifest, so the app loads only data plus the bodies it activates.
    pluginConfigPlugin(),
    ...sharedPlugins(),
    react({ include: /\.[jt]sx$/, exclude: [/\/node_modules\//] }),
    ConfigPlugin({ root: dirname }),
    IconsPlugin({
      symbolPattern: iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] }),
      assetPath: (iconSet, name, variant) => {
        switch (iconSet) {
          case 'dx':
            return `${dxosIcons}/${name}.svg`;
          case 'px':
            return `${extendedIcons}/${name}.svg`;
          default:
            return `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
        }
      },
      spriteFile: 'icons.svg',
      contentPaths: [
        path.join(rootDir, '/{packages,tools}/**/dist/**/*.{mjs,html}'),
        path.join(rootDir, '/{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
      ],
      scanPaths: [path.join(rootDir, '/packages/ui/ui-icons/src/index.ts')],
      assets: [
        { route: '/phosphor', dir: phosphorIconsCore },
        { route: '/px-icons', dir: extendedIcons },
      ],
    }),
    ThemePlugin({}),
  ],
});
