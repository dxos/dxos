//
// Copyright 2022 DXOS.org
//

import swc from '@rollup/plugin-swc';
import { DevTools } from '@vitejs/devtools';
import react from '@vitejs/plugin-react';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, searchForWorkspaceRoot, type ConfigEnv, type PluginOption, type Plugin } from 'vite';
import { withFilter } from 'vite';
import inspect from 'vite-plugin-inspect';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';
import wasm from 'vite-plugin-wasm';

import { importMapPlugin } from '@dxos/app-framework/vite-plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { isNonNullable } from '@dxos/util';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFalse = (str?: string) => str === 'false' || str === '0';

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Shared plugins for worker that are using in prod build.
// In dev vite uses root plugins for both worker and page.
const sharedPlugins = (env: ConfigEnv): PluginOption[] => [
  // Building from dist when creating a prod bundle.
  env.command === 'serve' &&
    importSource({
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
  DxosLogPlugin(),
  wasm(),
];

/**
 * https://vitejs.dev/config
 */
export default defineConfig((env) => ({
  devtools: {
    enabled: true,
  },
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
  build: {
    outDir: 'out/composer',
    sourcemap: true,
    minify: !isFalse(process.env.DX_MINIFY),
    // Target modern browsers for better performance and smaller bundle sizes.
    target: ['chrome108', 'edge107', 'firefox104', 'safari16'],
    rolldownOptions: {
      // NOTE: Set cache to `false` to help debug flaky builds.
      // cache: false,
      input: {
        internal: path.resolve(dirname, './internal.html'),
        main: path.resolve(dirname, './index.html'),
        devtools: path.resolve(dirname, './devtools.html'),
        reset: path.resolve(dirname, './reset.html'),
        'script-frame': path.resolve(dirname, './script-frame/index.html'),
      },
      output: {
        chunkFileNames,
      },
      devtools: {}, // enable devtools mode
    },
  },
  optimizeDeps: {
    exclude: ['@dxos/wa-sqlite'],
  },
  resolve: {
    alias: {
      ['node-fetch']: 'isomorphic-fetch',
      ['node:util']: '@dxos/node-std/util',
      ['node:path']: '@dxos/node-std/path',
      ['util']: '@dxos/node-std/util',
      ['path']: '@dxos/node-std/path',
      ['node:crypto']: '@dxos/node-std/crypto',
      ['crypto']: '@dxos/node-std/crypto',
      ['tiktoken/lite']: path.resolve(dirname, 'stub.mjs'),
      // NOTE: react-ui must be aliased because vite-plugin-import-source only intercepts imports from
      //   source files — imports embedded inside compiled dist/ files bypass it entirely.
      // '@dxos/react-ui': path.resolve(rootDir, 'packages/ui/react-ui/src'),
      // TODO(wittjosiah): Remove this once we have a better solution.
      // NOTE: This is a workaround to fix "dual package hazard" where dist output and local sources
      //   might resolve differently, resulting in two distinct module instances.
      '@dxos/solid-ui-geo': path.resolve(rootDir, 'packages/ui/solid-ui-geo/src'),
      '@dxos/plugin-map-solid': path.resolve(rootDir, 'packages/plugins/plugin-map-solid/src'),
      '@dxos/web-context-solid': path.resolve(rootDir, 'packages/common/web-context-solid/src'),
      '@dxos/effect-atom-solid': path.resolve(rootDir, 'packages/common/effect-atom-solid/src'),
      '@dxos/echo-solid': path.resolve(rootDir, 'packages/core/echo/echo-solid/src'),
      // Worker entry point for OPFS SQLite.
      '@dxos/client/opfs-worker': path.resolve(rootDir, 'packages/sdk/client/src/worker/opfs-worker.ts'),
    },
  },
  worker: {
    format: 'es' as const,

    plugins: () => [...sharedPlugins(env)],
  },
  plugins: [
    ...sharedPlugins(env),

    rssProxyPlugin(),

    rawMdLoader(),

    // env.command === 'serve' && devtoolsJson(),

    // Solid JSX transform for Solid packages.
    // Must be placed before React plugin to process Solid files first.
    solid({
      include: [
        '**/solid-ui-geo/**',
        '**/plugin-map-solid/**',
        '**/effect-atom-solid/**',
        '**/web-context-solid/**',
        '**/echo-solid/**',
        '**/node_modules/solid-js/**',
        '**/node_modules/solid-element/**',
        '**/node_modules/@solid-primitives/**',
      ],
    }),

    withFilter(
      swc({
        swc: {
          jsc: {
            parser: { syntax: 'typescript', decorators: true, tsx: true },
            transform: { decoratorVersion: '2021-12' },
          },
        },
      }),
      { transform: { id: /\.[mc]?[jt]sx?$/, code: '@' } },
    ),

    react(),

    importMapPlugin(),

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

    DevTools(),

    // https://github.com/antfu-collective/vite-plugin-inspect#readme
    // Open: http://localhost:5173/__inspect
    isTrue(process.env.DX_INSPECT) && inspect(),

    isTrue(process.env.DX_STATS) && [
      visualizer({
        emitFile: true,
        filename: 'stats.html',
      }),
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

    ThemePlugin({}),
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
  if (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.match(/index\.[^/]+$/gm)) {
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

// RSS proxy middleware for CORS-free feed fetching.
// TODO(dmaretskyi): replace with hosted CORS proxy on CF.
function rssProxyPlugin(): Plugin {
  return {
    name: 'rss-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rss', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const feedUrl = url.searchParams.get('url');
        if (!feedUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }
        try {
          const response = await globalThis.fetch(feedUrl);
          const contentType = response.headers.get('content-type');
          if (contentType) {
            res.setHeader('content-type', contentType);
          }
          res.statusCode = response.status;
          res.end(await response.text());
        } catch (error) {
          res.statusCode = 502;
          res.end(String(error));
        }
      });
    },
  };
}

// Handle .md?raw imports.
function rawMdLoader(): Plugin {
  return {
    name: 'raw-md-loader',
    load: {
      filter: { id: /\.md?raw$/ },
      handler(id: string) {
        const filePath = id.replace(/\?raw$/, '');
        const content = readFileSync(filePath, 'utf-8');
        return { code: `export default ${JSON.stringify(content)}`, moduleType: 'js' };
      },
    },
  };
}
