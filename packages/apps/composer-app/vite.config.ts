//
// Copyright 2022 DXOS.org
//

import importSource from '@dxos/vite-plugin-import-source';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type ConfigEnv, type Plugin, type PluginOption } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import inspect from 'vite-plugin-inspect';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { isNonNullable } from '@dxos/util';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

import { APP_KEY } from './src/constants';

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFalse = (str?: string) => str === 'false' || str === '0';

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Shared plugins for worker that are using in prod build.
// In dev vite uses root plugins for both worker and page.
const sharedPlugins = (env: ConfigEnv): PluginOption[] => [wasm(), sourcemaps()];

/**
 * https://vitejs.dev/config
 */
export default defineConfig((env) => ({
  root: dirname,
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: '../../../key.pem',
            cert: '../../../cert.pem',
          }
        : undefined,
    fs: {
      strict: false,
      cachedChecks: false,
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        rootDir,
      ],
    },
  },
  esbuild: {
    keepNames: true,
  },
  build: {
    outDir: 'out/composer',
    sourcemap: true,
    minify: !isFalse(process.env.DX_MINIFY),
    target: ['chrome89', 'edge89', 'firefox89', 'safari15'],
    rollupOptions: {
      // NOTE: Set cache to `false` to help debug flaky builds.
      // cache: false,
      input: {
        internal: path.resolve(dirname, './internal.html'),
        main: path.resolve(dirname, './index.html'),
        devtools: path.resolve(dirname, './devtools.html'),
        'script-frame': path.resolve(dirname, './script-frame/index.html'),
      },
      output: {
        chunkFileNames,
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
      'node:util': '@dxos/node-std/util',
      'tiktoken/lite': path.resolve(dirname, 'stub.mjs'),
    },
  },
  worker: {
    format: 'es' as const,

    plugins: () => [...sharedPlugins(env)],
  },
  plugins: [
    ...sharedPlugins(env),

    // https://github.com/antfu-collective/vite-plugin-inspect#readme
    // Open: http://localhost:5173/__inspect
    isTrue(process.env.DX_INSPECT) && inspect(),

    env.command === 'serve' && devtoolsJson(),

    // Building from dist when creating a prod bundle.
    env.command === 'serve' &&
      importSource({
        exclude: [
          '**/node_modules/**',
          '**/common/random-access-storage/**',
          '**/common/lock-file/**',
          '**/mesh/network-manager/**',
          '**/mesh/teleport/**',
          '**/sdk/config/**',
          '**/sdk/client-services/**',
          '**/sdk/observability/**',
          // TODO(dmaretskyi): Decorators break in lit.
          '**/ui/lit-*/**',
        ],
      }),

    react({
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
        // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
        [
          '@preact-signals/safe-react/swc',
          {
            mode: 'all',
          },
        ],
      ],
    }),

    importMapPlugin({
      modules: [
        '@dxos/app-framework',
        '@dxos/app-graph',
        '@dxos/client',
        '@dxos/client/devtools',
        '@dxos/client/echo',
        '@dxos/client/halo',
        '@dxos/client/invitations',
        '@dxos/client/mesh',
        '@dxos/client-protocol',
        '@dxos/client-services',
        '@dxos/config',
        '@dxos/echo',
        '@dxos/echo-signals',
        '@dxos/live-object',
        '@dxos/react-client',
        '@dxos/react-client/devtools',
        '@dxos/react-client/echo',
        '@dxos/react-client/halo',
        '@dxos/react-client/invitations',
        '@dxos/react-client/mesh',
        '@dxos/schema',
        '@effect/platform',
        'effect',
        'react',
        'react-dom',
      ],
    }),

    VitePWA({
      // No PWA for e2e tests because it slows them down (especially waiting to clear toasts).
      // No PWA in dev to make it easier to ensure the latest version is being used.
      // May be mitigated in the future by https://github.com/dxos/dxos/issues/4939.
      // https://vite-pwa-org.netlify.app/guide/unregister-service-worker.html#unregister-service-worker
      // NOTE: Check cached resources (on CF, and in the PWA).
      // curl -I --header "Cache-Control: no-cache" https://staging.composer.space/icons.svg
      selfDestroying: process.env.DX_PWA === 'false',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff2}'],
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS Composer',
        short_name: 'Composer',
        description: 'DXOS Composer',
        theme_color: '#003E70',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),

    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    sentryVitePlugin({
      org: 'dxos',
      project: 'composer-app',
      sourcemaps: {
        assets: './packages/apps/composer-app/out/composer/**',
      },
      authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
      disable: process.env.DX_ENVIRONMENT !== 'production',
      release: {
        name: `${APP_KEY}@${process.env.npm_package_version}`,
      },
    }),

    // https://github.com/antfu-collective/vite-plugin-inspect#readme
    // Open: http://localhost:5173/__inspect
    isTrue(process.env.DX_INSPECT) && inspect(),

    isTrue(process.env.DX_STATS) && [
      visualizer({
        emitFile: true,
        filename: 'stats.html',
      }),

      // https://www.bundle-buddy.com/rollup
      {
        name: 'bundle-buddy',
        buildEnd() {
          const deps: { source: string; target: string }[] = [];
          // @ts-ignore
          for (const id of this.getModuleIds()) {
            // @ts-ignore
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

    //
    // DXOS plugins
    //

    ConfigPlugin({
      root: dirname,
    }),

    IconsPlugin({
      symbolPattern: '(ph|dx)--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
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
      ],
      // verbose: true,
    }),

    ThemePlugin({
      root: dirname,
      content: [
        path.resolve(dirname, './index.html'),
        path.resolve(dirname, './src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/devtools/*/src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/experimental/*/src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/plugins/*/src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/sdk/*/src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/ui/*/src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
  ]
    .filter(isNonNullable)
    .flat(), // Plugins

  ...createTestConfig({ dirname, node: true, storybook: true }),
}));

/**
 * Generate nicer chunk names.
 * Default makes most chunks have names like index-[hash].js.
 */
function chunkFileNames(chunkInfo: any) {
  if (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.match(/index.[^\/]+$/gm)) {
    let segments: any[] = chunkInfo.facadeModuleId.split('/').reverse().slice(1);
    const nodeModulesIdx = segments.indexOf('node_modules');
    if (nodeModulesIdx !== -1) {
      segments = segments.slice(0, nodeModulesIdx);
    }
    const ignoredNames = ['dist', 'lib', 'browser'];
    const significantSegment = segments.find((segment) => !ignoredNames.includes(segment));
    if (significantSegment) {
      return `assets/${significantSegment}-[hash].js`;
    }
  }

  return 'assets/[name]-[hash].js';
}

function importMapPlugin(options: { modules: string[] }): Plugin[] {
  const chunkRefIds: Record<string, string> = {};
  let imports: Record<string, string> = {};

  return [
    {
      name: 'import-map:get-chunk-ref-ids',
      async buildStart() {
        for (const m of options.modules) {
          const resolved = await this.resolve(m);
          if (resolved) {
            // Emit the chunk during build start.
            chunkRefIds[m] = this.emitFile({
              type: 'chunk',
              id: resolved.id,
              // Preserve the original exports.
              preserveSignature: 'strict',
            });
          }
        }
      },

      generateBundle() {
        imports = Object.fromEntries(options.modules.map((m) => [m, `/${this.getFileName(chunkRefIds[m])}`]));
      },
    },
    {
      name: 'import-map:transform-index-html',
      enforce: 'post',
      transformIndexHtml(html: string) {
        const tags = [
          {
            tag: 'script',
            attrs: {
              type: 'importmap',
            },
            children: JSON.stringify({ imports }, null, 2),
          },
        ];

        return {
          html,
          tags,
        };
      },
    },
  ];
}
