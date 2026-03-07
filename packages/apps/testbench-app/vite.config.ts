//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react-swc';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceMaps from 'rollup-plugin-sourcemaps';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { UserConfig, ConfigEnv } from 'vitest/config';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const resolveConditions = (env: ConfigEnv) =>
  env.command === 'serve' ? ['source', 'module', 'browser', 'development', 'production'] : undefined;

const ssrResolveConditions = (env: ConfigEnv) =>
  env.command === 'serve' ? ['source', 'module', 'node', 'development', 'production'] : undefined;

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
        conditions: resolveConditions(env),
        alias: {
          ['node-fetch']: 'isomorphic-fetch',
          ['node:util']: '@dxos/node-std/util',
          ['node:path']: '@dxos/node-std/path',
          ['util']: '@dxos/node-std/util',
          ['path']: '@dxos/node-std/path',
          ['tiktoken/lite']: path.resolve(dirname, 'stub.mjs'),
        },
      },
      ssr: {
        resolve: {
          conditions: ssrResolveConditions(env),
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
            manualChunks: {
              react: ['react', 'react-dom', 'react-router-dom'],
              dxos: ['@dxos/react-client'],
              ui: ['@dxos/react-ui', '@dxos/ui-theme'],
              editor: ['@dxos/react-ui-editor'],
            },
          },
        },
      },
      worker: {
        format: 'es',
        plugins: () => [WasmPlugin(), sourceMaps()],
      },
      plugins: [
        sourceMaps(),

        ConfigPlugin({
          root: dirname,
          env: ['DX_VAULT'],
        }),
        ThemePlugin({}),
        WasmPlugin(),
        ReactPlugin({
          tsDecorators: true,
          plugins: [
            [
              '@dxos/swc-log-plugin',
              {
                to_transform: [
                  {
                    name: 'log',
                    package: '@dxos/log',
                    param_index: 2,
                    include_args: false,
                    include_call_site: true,
                    include_scope: true,
                  },
                  {
                    name: 'dbg',
                    package: '@dxos/log',
                    param_index: 1,
                    include_args: true,
                    include_call_site: false,
                    include_scope: false,
                  },
                  {
                    name: 'invariant',
                    package: '@dxos/invariant',
                    param_index: 2,
                    include_args: true,
                    include_call_site: false,
                    include_scope: true,
                  },
                  {
                    name: 'Context',
                    package: '@dxos/context',
                    param_index: 1,
                    include_args: false,
                    include_call_site: false,
                    include_scope: false,
                  },
                ],
              },
            ],
          ],
        }),
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
