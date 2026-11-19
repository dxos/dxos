//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import path from 'node:path';
import { ResolverFactory } from 'oxc-resolver';
import { type PluginOption, defineConfig, searchForWorkspaceRoot } from 'vite';
import wasm from 'vite-plugin-wasm';

import { pluginConfigPlugin } from '@dxos/app-framework/vite-plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ModuleUrlPlugin } from '@dxos/vite-plugin-module-url';

import { type ShareBucket, type ShareObject, handleShare, isSharePath } from './src/functions/share.ts';

const dirname = import.meta.dirname;
const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');
const extendedIcons = path.join(rootDir, '/packages/ui/ui-icons/assets');

// Same targets as composer-app: all of them run top-level await, which the wasm glue relies on.
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

const WORKER_ENTRIES: Record<string, string> = {
  '@dxos/client/coordinator-worker': 'packages/sdk/client/src/services/dedicated/coordinator-worker-entrypoint.ts',
  '@dxos/react-ui-canvas/generator-worker': 'packages/ui/react-ui-canvas/src/generator/worker.ts',
};

// These packages' `browser` entrypoints initialize their wasm with top-level await, and Safari before 27 then
// evaluates a module before its dependencies when plugins load concurrently (https://bugs.webkit.org/show_bug.cgi?id=242740).
const SLIM_WASM_PACKAGES = ['@automerge/automerge', '@automerge/automerge-repo', '@automerge/automerge-subduction'];

/** Resolves {@link SLIM_WASM_PACKAGES} to `slim`, and their subpaths without the `browser` condition, so one wasm instance serves every importer. */
const slimWasm = (): PluginOption => {
  const resolver = new ResolverFactory({ conditionNames: ['source', 'import', 'module', 'default'] });
  let isBuild = false;
  return {
    name: 'dxos-slim-wasm',
    enforce: 'pre',
    configResolved: (config) => {
      isBuild = config.command === 'build';
    },
    resolveId: {
      order: 'pre',
      handler: (source, importer) => {
        const pkg = SLIM_WASM_PACKAGES.find((name) => source === name || source.startsWith(`${name}/`));
        // The dev server serves automerge-repo from its optimizer chunk, whose CJS interop a raw path would bypass.
        if (!importer || !pkg || (pkg === '@automerge/automerge-repo' && !isBuild)) {
          return null;
        }
        const resolved = resolver.sync(path.dirname(importer), source === pkg ? `${pkg}/slim` : source);
        return resolved.error || !resolved.path ? null : resolved.path;
      },
    },
  };
};

/**
 * The Worker's share API (spec F-12) on the dev server, over a bucket held in memory, so the site editor's
 * "Open in app" (`moon run drawing-app:serve-site`) and the app's `?d=` import work locally. Shares last until the
 * server restarts.
 */
const devShareApi = (): PluginOption => ({
  name: 'drawing-app:dev-share-api',
  apply: 'serve',
  configureServer: (server) => {
    const objects = new Map<string, ShareObject>();
    const bucket: ShareBucket = {
      get: async (key) => objects.get(key) ?? null,
      put: async (key, value, options) => {
        objects.set(key, { uploaded: new Date(), customMetadata: options?.customMetadata, text: async () => value });
      },
    };
    server.middlewares.use(async (request, response, next) => {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (!isSharePath(url.pathname)) {
        return next();
      }
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) {
          chunks.push(Buffer.from(chunk));
        }
        const headers = new Headers();
        for (const [name, value] of Object.entries(request.headers)) {
          if (typeof value === 'string') {
            headers.set(name, value);
          }
        }
        const method = request.method ?? 'GET';
        const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks);
        const reply = await handleShare(new Request(url, { method, headers, body }), { SHARES: bucket });
        response.statusCode = reply.status;
        reply.headers.forEach((value, name) => response.setHeader(name, value));
        response.end(Buffer.from(await reply.arrayBuffer()));
      } catch (error) {
        next(error);
      }
    });
  },
});

/** Shared by the page and the client workers, which resolve the same `@dxos/*` sources. */
const sharedPlugins = (): PluginOption[] => [
  importSource({ include: ['@dxos/**', '#*'] }),
  slimWasm(),
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
    rolldownOptions: {
      experimental: { chunkOptimization: false },
    },
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
    // Chunk optimization moves modules a worker shares with its lazy chunks into its entry chunk, and WebKit
    // evaluates a module worker's entry again when a chunk imports it (https://bugs.webkit.org/show_bug.cgi?id=324459).
    rolldownOptions: { experimental: { chunkOptimization: false } },
  },
  plugins: [
    // Replaces each plugin's `dx.config.ts` with its manifest, so the app loads only data plus the bodies it activates.
    pluginConfigPlugin(),
    devShareApi(),
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
