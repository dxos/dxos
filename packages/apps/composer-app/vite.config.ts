//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// import sourcemaps from 'rollup-plugin-sourcemaps';
import { visualizer } from 'rollup-plugin-visualizer';
import { type ConfigEnv, type PluginOption, defineConfig, searchForWorkspaceRoot } from 'vite';
// import devtoolsJson from 'vite-plugin-devtools-json';
import inspect from 'vite-plugin-inspect';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';
import wasm from 'vite-plugin-wasm';

import { bootLoaderPlugin, importMapPlugin } from '@dxos/app-framework/vite-plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { isNonNullable } from '@dxos/util';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';

import { createConfig as createTestConfig } from '../../../vitest.base.config';

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFalse = (str?: string) => str === 'false' || str === '0';
const isFastBundle = isTrue(process.env.DX_FASTBUNDLE);
// DX_PLUGIN_SET=minimal (serve-min task) swaps the full plugin registry for
// plugin-defs.minimal.tsx without touching main.tsx.
const isMinimalPluginSet = process.env.DX_PLUGIN_SET === 'minimal';

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Transpile targets for oxc (dev) and Rolldown (build).
 */
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

// Shared plugins for worker that are using in prod build.
// In dev vite uses root plugins for both worker and page.
const sharedPlugins = (env: ConfigEnv): PluginOption[] => [
  // Resolve `@dxos/*` (and matching `#*` subpath imports) via the `source`
  // condition rather than the published `dist/`. This is required at both
  // `serve` and `build` time so Vite-specific constructs survive into the
  // consumer's transform pipeline:
  //   * `import.meta.glob` runs at this app's build (not pre-baked as plain
  //     text in `dist`).
  //   * `?url` static-asset imports (e.g. plugin-zen's m4a samples,
  //     plugin-script's `esbuild.wasm`) get real bundled URLs instead of
  //     the `""` empty-url stub that `dx-compile` writes into `dist`.
  // Under `DX_FASTBUNDLE` (smoke-test/preview build) only the `@dxos/**`-to-source
  // forcing is skipped, where build speed wins over correctness for unchanged source.
  // Package-internal `#*` subpath imports must still resolve to source, or they fall
  // through to `dist/lib/neutral/*` and fail when a package has not been compiled.
  importSource({
    include: isFastBundle ? ['#*'] : ['@dxos/**', '#*'],
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
  wasm(),
  // sourcemaps(),
];

/**
 * https://vitejs.dev/config
 */
export default defineConfig((env) => ({
  root: dirname,
  define: {
    // Per-dev-server-instance id (config re-evaluates on every server start/restart). main.tsx
    // suffixes the coordinator SharedWorker *name* with it so a restarted server gets a fresh
    // coordinator instead of attaching to a stale-code instance (SharedWorkers are keyed by
    // URL + name). Empty in production builds — the name must stay stable across deploys.
    __DX_DEV_SERVER_BOOT_ID__: JSON.stringify(env.command === 'serve' ? Date.now().toString(36) : ''),
  },
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: '../../../key.pem',
            cert: '../../../cert.pem',
          }
        : undefined,
    watch: {
      // Coalesce write bursts (codemods, formatters, git checkout/rebase) into
      // a single HMR pass: chokidar holds add/change events until the file size
      // has been stable for `stabilityThreshold` ms, so a hundred-file burst
      // produces one invalidation wave instead of one per write. Costs ~200 ms
      // of HMR latency on every save — acceptable against the multi-second
      // rescan queue a burst otherwise produces (each invalidation of the
      // theme CSS re-runs a monorepo-wide Tailwind scan).
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    },
    fs: {
      strict: false,
      cachedChecks: false,
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        rootDir,
      ],
    },
    // Pre-transform the critical-path source files when `vite serve` starts,
    // before any browser request. The first navigation finds them already
    // in the transform cache.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/workers/dedicated-worker.ts',
        './src/workers/coordinator-worker.ts',
        isMinimalPluginSet ? './src/plugin-defs.minimal.tsx' : './src/plugin-defs.tsx',
      ],
    },
  },
  oxc: {
    target: [...browserTargets],
  },

  build: {
    outDir: 'out/composer',
    sourcemap: true,
    minify: !isFalse(process.env.DX_MINIFY),
    target: [...browserTargets],
    rollupOptions: {
      // NOTE: Set cache to `false` to help debug flaky builds.
      // cache: false,
      input: {
        internal: path.resolve(dirname, './internal.html'),
        main: path.resolve(dirname, './index.html'),
        devtools: path.resolve(dirname, './devtools.html'),
        reset: path.resolve(dirname, './reset.html'),
        recovery: path.resolve(dirname, './recovery.html'),
      },
      // NOTE: Vite 8 / rolldown eagerly walks into the `test` config imported via
      // `vitest.base.config.ts`, which pulls in @vitest/browser-playwright -> playwright(-core)
      // and its CJS-only chromium-bidi deps. These are dev-only, must not be in the app bundle,
      // and cannot be resolved cleanly as ESM, so mark them external.
      external: ['playwright', 'playwright-core', /^chromium-bidi(\/|$)/, '@vitest/browser-playwright'],
      output: {
        chunkFileNames,
        // Rolldown (used by Vite 8) requires `manualChunks` to be a function — the
        // record form that worked in Rollup is rejected at runtime.
        manualChunks: (id: string) => {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dxos/wa-sqlite'],
    // List deeply-imported dep entrypoints so vite's optimize-deps phase
    // pre-bundles them up front. Without this, vite discovers them mid-load
    // (when a dynamic import unwraps a new subpath), which forces a full page
    // reload with the "Discovered new dependencies" banner — ~10 s of wasted
    // dev time per discovery cycle and the most common cause of HMR appearing
    // to hang. The pre-bundle cost is amortized after the first `vite serve`.
    //
    // IMPORTANT: every entry must be resolvable from this app's root. If even
    // one is not, vite aborts the *entire* dependency scan ("Failed to run
    // dependency scan. Skipping dependency pre-bundling.") and pre-bundles
    // nothing — worse than an empty list. Several entries below (@automerge/*,
    // @atlaskit/pragmatic-drag-and-drop*, @effect/ai*, @opentelemetry/*,
    // xstate, @xstate/react, react-qr-rounded) are only transitive deps of
    // `@dxos/*` packages; they are listed as direct deps of composer-app in
    // package.json *specifically* so they resolve from root and can be
    // pre-bundled here — each one was observed triggering a mid-session
    // "discovered new dependencies" reload before being added.
    include: [
      // React.
      'react',
      'react-dom',
      'react/jsx-runtime',
      // Effect (with subpath imports).
      'effect',
      'effect/Effect',
      'effect/Array',
      'effect/Ref',
      'effect/Option',
      'effect/Cause',
      'effect/Exit',
      'effect/Layer',
      'effect/Runtime',
      'effect/Fiber',
      'effect/Deferred',
      'effect/Function',
      'effect/HashSet',
      'effect/PubSub',
      'effect/Schema',
      'effect/Context',
      'effect/Stream',
      'effect/Console',
      '@effect/platform',
      '@effect/platform-browser',
      // Effect Atom (reactive state; always loaded, triggered a mid-session reload before being listed).
      '@effect-atom/atom',
      '@effect-atom/atom/Registry',
      // Effect AI (with submodule exports).
      '@effect/ai',
      '@effect/ai/AiError',
      '@effect/ai/Chat',
      '@effect/ai/LanguageModel',
      '@effect/ai/Prompt',
      '@effect/ai/Response',
      '@effect/ai/Tool',
      '@effect/ai/Toolkit',
      '@effect/ai-anthropic',
      '@effect/ai-anthropic/AnthropicClient',
      '@effect/ai-anthropic/AnthropicLanguageModel',
      '@effect/ai-anthropic/AnthropicTool',
      '@effect/ai-openai',
      '@effect/ai-openai/OpenAiClient',
      '@effect/ai-openai/OpenAiLanguageModel',
      // Automerge (CRDT; deeply imported via @dxos/echo).
      '@automerge/automerge',
      '@automerge/automerge-repo',
      // OpenTelemetry (loaded eagerly via @dxos/observability).
      '@opentelemetry/api',
      '@opentelemetry/api-logs',
      '@opentelemetry/exporter-logs-otlp-http',
      '@opentelemetry/exporter-metrics-otlp-http',
      '@opentelemetry/sdk-logs',
      '@opentelemetry/sdk-metrics',
      // XState + QR (HALO invitation flow via @dxos/shell).
      'xstate',
      '@xstate/react',
      'react-qr-rounded',
      // Atlaskit drag-and-drop (mosaic / dnd).
      '@atlaskit/pragmatic-drag-and-drop',
      '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator',
      // CodeMirror (many files in HAR).
      'codemirror',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/commands',
      '@codemirror/autocomplete',
      '@codemirror/lang-javascript',
      '@codemirror/lang-json',
      '@codemirror/lang-markdown',
      '@codemirror/theme-one-dark',
      // Radix (many requests in HAR).
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-popover',
      '@radix-ui/react-slot',
      '@radix-ui/react-context-menu',
    ],
    // Scan the auxiliary HTML entrypoints during pre-bundle so navigations
    // to `internal.html` / `devtools.html` / `reset.html` don't trip a
    // "discovered new dependencies" reload mid-session.
    //
    // Additionally, point the scanner at every plugin's entry files. Plugins
    // are loaded via `await import(...)` at runtime so their bare-module
    // imports aren't reachable from the static graph rooted at `index.html` —
    // Vite would discover them mid-session and trigger a re-optimize + full
    // page reload per plugin family. Walking the entries at startup makes the
    // first optimize-deps pass discover all transitive deps. Production
    // bundling is unaffected: Rolldown still emits a separate chunk per
    // dynamic import.
    entries: [
      './index.html',
      './internal.html',
      './devtools.html',
      './reset.html',
      './recovery.html',
      // Under DX_PLUGIN_SET=minimal only the plugins registered in
      // plugin-defs.minimal.tsx are scanned — keep the brace list in sync.
      isMinimalPluginSet
        ? path.resolve(
            rootDir,
            'packages/plugins/plugin-{assistant,attention,client,comments,deck,graph,inbox,markdown,navtree,observability,onboarding,registry,settings,simple-layout,space,spotlight,status-bar,theme,thread}/src/index.{ts,tsx}',
          )
        : path.resolve(rootDir, 'packages/plugins/*/src/index.{ts,tsx}'),
    ],
  },
  resolve: {
    // NOTE: Under Vite 8 / rolldown, string-keyed aliases are treated as prefix matches, which means
    // a bare `util` alias also rewrites `util/types` → `@dxos/node-std/util/types` (not exported).
    // Use regex `find: /^util$/` (array form) to bind the bare module name only and let Vite's
    // native node: polyfill layer handle subpaths like `node:util/types`.
    alias: [
      ...(isMinimalPluginSet
        ? [{ find: /^\.\/plugin-defs$/, replacement: path.resolve(dirname, 'src/plugin-defs.minimal.tsx') }]
        : []),
      { find: /^node-fetch$/, replacement: 'isomorphic-fetch' },
      { find: /^node:util$/, replacement: '@dxos/node-std/util' },
      { find: /^node:path$/, replacement: '@dxos/node-std/path' },
      { find: /^util$/, replacement: '@dxos/node-std/util' },
      { find: /^path$/, replacement: '@dxos/node-std/path' },
      { find: /^node:crypto$/, replacement: '@dxos/node-std/crypto' },
      { find: /^crypto$/, replacement: '@dxos/node-std/crypto' },
      { find: /^node:stream$/, replacement: '@dxos/node-std/stream' },
      { find: /^stream$/, replacement: '@dxos/node-std/stream' },
      { find: /^tiktoken\/lite$/, replacement: path.resolve(dirname, 'stub.mjs') },
      // NOTE: react-ui must be aliased because vite-plugin-import-source only intercepts imports from
      //   source files — imports embedded inside compiled dist/ files bypass it entirely.
      // '@dxos/react-ui': path.resolve(rootDir, 'packages/ui/react-ui/src'),
      // TODO(wittjosiah): Remove this once we have a better solution.
      // NOTE: This is a workaround to fix "dual package hazard" where dist output and local sources
      //   might resolve differently, resulting in two distinct module instances.
      { find: '@dxos/solid-ui-geo', replacement: path.resolve(rootDir, 'packages/ui/solid-ui-geo/src') },
      { find: '@dxos/plugin-map-solid', replacement: path.resolve(rootDir, 'packages/plugins/plugin-map-solid/src') },
      { find: '@dxos/web-context-solid', replacement: path.resolve(rootDir, 'packages/common/web-context-solid/src') },
      { find: '@dxos/effect-atom-solid', replacement: path.resolve(rootDir, 'packages/common/effect-atom-solid/src') },
      { find: '@dxos/echo-solid', replacement: path.resolve(rootDir, 'packages/core/echo/echo-solid/src') },
      // Worker entry point for OPFS SQLite.
      {
        find: '@dxos/client/opfs-worker',
        replacement: path.resolve(rootDir, 'packages/sdk/client/src/worker/opfs-worker.ts'),
      },
    ],
  },
  worker: {
    format: 'es' as const,

    plugins: () => [...sharedPlugins(env)],
  },
  plugins: [
    ShutdownPlugin(),
    ...sharedPlugins(env),

    // RSS proxy middleware for CORS-free feed fetching.
    {
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
    },

    // Dev-only: serve forensics test profile for recovery import testing.
    {
      name: 'recovery-test-fixture',
      configureServer(server) {
        const fixturePath =
          process.env.COMPOSER_TEST_DXPROFILE ??
          '/tmp/composer-forensics/main.composer.space-test/main.composer.space.dxprofile';
        server.middlewares.use('/test-fixtures/main.composer.space.dxprofile', (req, res) => {
          if (!existsSync(fixturePath)) {
            res.statusCode = 404;
            res.end(`Test profile not found at ${fixturePath}`);
            return;
          }
          res.setHeader('Content-Type', 'application/octet-stream');
          createReadStream(fixturePath).pipe(res);
        });
      },
    },

    // Handle .md?raw imports.
    {
      name: 'raw-md-loader',
      load(id: string) {
        if (id.endsWith('.md?raw')) {
          const filePath = id.replace(/\?raw$/, '');
          const content = readFileSync(filePath, 'utf-8');
          return `export default ${JSON.stringify(content)}`;
        }
      },
    },

    // https://github.com/antfu-collective/vite-plugin-inspect#readme
    // Open: http://localhost:5173/__inspect
    isTrue(process.env.DX_INSPECT) && inspect(),

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

    react(),

    // Emit a `<script type="importmap">` into the production HTML mapping shared
    // bare specifiers (`react`, `effect`, `@dxos/client`, etc.) to dedicated chunk
    // URLs the host serves. Two consumers:
    //   1. **Third-party plugins (primary)** — remote plugin bundles externalize
    //      these specifiers via `composerPlugin`'s `isSharedPackage`; the import
    //      map is what lets a plugin loaded from a third-party origin call
    //      `import 'react'` and get the host's React instance instead of bundling
    //      a duplicate copy. Singleton-correct hooks, contexts, and ECHO state
    //      depend on this.
    //   2. **In-browser console use** — once the importmap is registered, the
    //      DevTools console can `await import('@dxos/client')` and reach the
    //      host's instance for ad-hoc inspection / scripting.
    //
    // Currently `apply: 'build'`-gated; the dev-mode path is a TODO documented
    // on the plugin definition (it raced with Vite's optimize-deps and produced
    // a chunk-content drift + partial-batch crash cascade).
    importMapPlugin(),

    // Hand the boot loader the Composer brand mark so the visual identity
    // is established before any JS bundle parses. The SVG carries its own
    // brand-palette fills (no `currentColor` reliance) and ships as ~2 KB of
    // inline markup. Wrapped in try/catch so an asset rename or move only
    // loses the brand mark — the loader still renders the bar + status
    // without it.
    bootLoaderPlugin({
      markSvg: (() => {
        const markPath = path.join(rootDir, 'packages/ui/brand/assets/icons/composer-icon.svg');
        try {
          return readFileSync(markPath, 'utf8');
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`bootLoaderPlugin: composer brand mark not found at ${markPath}; running without mark.`, error);
          return undefined;
        }
      })(),
    }),

    VitePWA({
      // No PWA for e2e tests because it slows them down (especially waiting to clear toasts).
      // No PWA in dev to make it easier to ensure the latest version is being used.
      // May be mitigated in the future by https://github.com/dxos/dxos/issues/4939.
      // https://vite-pwa-org.netlify.app/guide/unregister-service-worker.html#unregister-service-worker
      // NOTE: Check cached resources (on CF, and in the PWA).
      // curl -I --header "Cache-Control: no-cache" https://staging.composer.space/icons.svg
      selfDestroying: process.env.DX_PWA === 'false',
      // injectManifest mode: bundle a custom service worker (src/sw.ts) so we can intercept
      // fetches for third-party plugin assets and serve them from a dedicated cache when
      // offline. The host shell still gets the same Workbox-managed precache.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
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
