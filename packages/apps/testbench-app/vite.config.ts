//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceMaps from 'rollup-plugin-sourcemaps';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import WasmPlugin from 'vite-plugin-wasm';
import { UserConfig } from 'vitest/config';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import PluginImportSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(
  (env) =>
    ({
      root: __dirname,
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
                key: '../../../key.pem',
                cert: '../../../cert.pem',
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
      resolve: {
        alias: {
          ['node-fetch']: 'isomorphic-fetch',
          ['node:util']: '@dxos/node-std/util',
          ['node:path']: '@dxos/node-std/path',
          ['util']: '@dxos/node-std/util',
          ['path']: '@dxos/node-std/path',
          ['tiktoken/lite']: path.resolve(dirname, 'stub.mjs'),
        },
      },
      esbuild: {
        keepNames: true,
      },
      build: {
        outDir: 'out/testbench-app',
        sourcemap: true,
        minify: false,
        target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
        rollupOptions: {
          input: {
            main: path.resolve(dirname, './index.html'),
            shell: path.resolve(dirname, './shell.html'),
          },
          output: {
            // Rolldown (used by Vite 8) requires `manualChunks` to be a function — the
            // record form that worked in Rollup is rejected at runtime.
            manualChunks: (id: string) => {
              if (
                id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/react-router-dom/')
              ) {
                return 'react';
              }
              if (id.includes('/node_modules/@dxos/react-client/')) {
                return 'dxos';
              }
              if (id.includes('/node_modules/@dxos/react-ui/') || id.includes('/node_modules/@dxos/ui-theme/')) {
                return 'ui';
              }
              if (id.includes('/node_modules/@dxos/react-ui-editor/')) {
                return 'editor';
              }
            },
          },
        },
      },
      worker: {
        format: 'es',
        plugins: () => [
          WasmPlugin(),
          sourceMaps(),
          env.command === 'serve' &&
            PluginImportSource({
              exclude: [
                '@dxos/random-access-storage',
                '@dxos/lock-file',
                '@dxos/network-manager',
                '@dxos/teleport',
                '@dxos/config',
                '@dxos/client-services',
                '@dxos/observability',
                // TODO(dmaretskyi): Decorators break in lit.
                '@dxos/lit-*',
              ],
            }),
        ],
      },
      plugins: [
        ShutdownPlugin(),
        sourceMaps(),

        // Building from dist when creating a prod bundle.
        env.command === 'serve' &&
          PluginImportSource({
            exclude: [
              '@dxos/random-access-storage',
              '@dxos/lock-file',
              '@dxos/network-manager',
              '@dxos/teleport',
              '@dxos/config',
              '@dxos/client-services',
              '@dxos/observability',
              // TODO(dmaretskyi): Decorators break in lit.
              '@dxos/lit-*',
            ],
          }),

        // Dev log file sink (serve only) + Rolldown log-meta injection (serve + build).
        DxosLogPlugin(),

        ConfigPlugin({
          root: dirname,
          env: ['DX_VAULT'],
        }),
        IconsPlugin({
          // The leading negative lookahead restricts the `dx` set to the `regular` weight only (custom
          // brand SVGs have no weight variants); the `ph` set retains all Phosphor weights.
          symbolPattern:
            '(?!dx--[a-z]+[a-z-]*--(?:bold|duotone|fill|light|thin))(ph|dx)--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (iconSet, name, variant) => {
            switch (iconSet) {
              case 'dx':
                return `${dxosIcons}/${name}.svg`;
              default:
                return `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
            }
          },
          spriteFile: 'icons.svg',
          contentPaths: [
            path.join(rootDir, '/{packages,tools}/**/dist/**/*.{mjs,html}'),
            path.join(rootDir, '/{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
            path.join(rootDir, '/{packages,tools}/**/dx.config.{ts,tsx,js,jsx}'),
          ],
        }),
        ThemePlugin({}),
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
            const outDir = path.join(dirname, 'out');
            if (!existsSync(outDir)) {
              mkdirSync(outDir);
            }
            writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
          },
        },
      ],
      ...createTestConfig({ dirname, node: true, storybook: true }),
    }) as UserConfig,
);
