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
      // Use the fs.watch backend, not fsevents. chokidar's fsevents handler keeps ONE native stream per
      // root with a Set of listeners — one per watched path — and routes every event by running
      // `indexOf` against every listener (lib/fsevents-handler.js, `cont.listeners.forEach`). Resolving
      // `@dxos/*` from source means a watch per transformed module, so that set runs to thousands and
      // grows as more of the app is browsed; a write burst then pins the main thread and the server
      // stops responding (diagnosed via `moon run composer-app:diagnose-serve`: 4062 of 4064 samples in
      // fse_dispatch_event, with no idle time at all). `ignored` does not help — chokidar filters after
      // this routing, so the scan happens regardless.
      useFsEvents: false,
      // Build output is not source, and the watch root spans the monorepo, so a single
      // `moon run <pkg>:build` — which rewrites dist across many packages — is a large event burst for
      // no benefit. Vite already ignores .git, node_modules, test-results and its cache dir, and merges
      // these in. Trade-off: rebuilding a package whose dist is consumed at runtime no longer triggers
      // HMR, so that needs a server restart — the honest behaviour for a prebuilt dependency.
      ignored: ['**/dist/**', '**/.moon/cache/**', '**/temp/**', '**/coverage/**', '**/*.tsbuildinfo'],
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
  preview: {
    // With https enabled (and no proxy) vite serves preview over HTTP/2, whose stream
    // multiplexing removes the ~6-connection HTTP/1.1 request serialization across the
    // ~500-chunk boot preload wave — the dominant pre-main cost when previewing locally.
    // Same opt-in as `server`: HTTPS=true with key/cert at the repo root.
    https:
      process.env.HTTPS === 'true'
        ? {
            key: '../../../key.pem',
            cert: '../../../cert.pem',
          }
        : undefined,
  },

  oxc: {
    target: [...browserTargets],
  },

  build: {
    outDir: 'out/composer',
    sourcemap: true,
    minify: !isFalse(process.env.DX_MINIFY),
    target: [...browserTargets],
    rolldownOptions: {
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
        // Chunk grouping. Rolldown's default share-set splitting yields ~4,800 chunks
        // (median 1.5KB) — ~520 of them on main's boot path, whose per-request overhead
        // dominates boot. Inference-based grouping is unsafe here (measured 2026-08:
        // per-package groups welded each package's eager/lazy halves, boot 4.03->10.07MB;
        // `$initial` tags span all five HTML entries plus recursive deps, boot ->19MB), so
        // the `boot` group instead tests membership in a generated manifest of main's
        // statically reachable modules (boot-manifest.json, rewritten on every bundle by
        // bootManifestPlugin — the module set is invariant under re-chunking, so it is a
        // stable fixpoint). Modules outside the manifest keep default splitting; a new
        // eager module simply gets its own chunk until the next build regenerates the file.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/]react(-dom)?[\\/]/, priority: 10 },
            // Naive maxSize splitting cuts through module cycles and breaks evaluation
            // order (rolldown#8803); the fix rolldown offers (strictExecutionOrder) costs
            // ~+1.8MB of inhibited treeshaking. Instead the manifest carries a cycle-safe
            // partition (see bootPartition) and each bucket becomes its own chunk.
            {
              name: bootGroupName,
              includeDependenciesRecursively: false,
              priority: 5,
            },
          ],
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
            'packages/plugins/plugin-{assistant,attention,client,debug,deck,devtools,graph,inbox,markdown,navtree,observability,onboarding,outliner,preview,projects,registry,review,routine,settings,simple-layout,space,spotlight,status-bar,theme,thread}/src/index.{ts,tsx}',
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
    bootManifestPlugin(),

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

    // Byte attribution for the startup-latency map: which chunk carries which package's bytes,
    // and which module facade owns the chunk. `scripts/analyze-startup.mjs` joins this against
    // the harness report's fetched-resource list to attribute startup bytes per plugin.
    isTrue(process.env.DX_CHUNK_STATS) && {
      name: 'chunk-stats',
      generateBundle(_options: unknown, bundle: Record<string, any>) {
        const packageOf = (id: string): string => {
          const nodeModules = id.lastIndexOf('node_modules/');
          if (nodeModules !== -1) {
            const rest = id.slice(nodeModules + 'node_modules/'.length);
            const [scope, name] = rest.split('/');
            return scope.startsWith('@') ? `${scope}/${name}` : scope;
          }
          const pkg = id.match(/packages\/[^/]+\/([^/]+)\/src\//);
          if (pkg) {
            return `@dxos/${pkg[1]}`;
          }
          return id.includes('composer-app') ? 'composer-app' : 'other';
        };
        const chunks = Object.values(bundle)
          .filter((output: any) => output.type === 'chunk')
          .map((chunk: any) => {
            const byPackage: Record<string, number> = {};
            for (const [id, mod] of Object.entries(chunk.modules ?? {})) {
              const pkg = packageOf(id);
              byPackage[pkg] = (byPackage[pkg] ?? 0) + ((mod as any).renderedLength ?? 0);
            }
            return {
              fileName: chunk.fileName,
              bytes: chunk.code?.length ?? 0,
              isEntry: chunk.isEntry ?? false,
              isDynamicEntry: chunk.isDynamicEntry ?? false,
              facadeModuleId: chunk.facadeModuleId ?? null,
              imports: chunk.imports ?? [],
              dynamicImports: chunk.dynamicImports ?? [],
              byPackage,
            };
          });
        const assets = Object.values(bundle)
          .filter((output: any) => output.type === 'asset')
          .map((asset: any) => ({
            fileName: asset.fileName,
            bytes: typeof asset.source === 'string' ? Buffer.byteLength(asset.source) : (asset.source?.byteLength ?? 0),
          }));
        const outDir = path.join(dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(path.join(outDir, 'chunk-stats.json'), JSON.stringify({ chunks, assets }, null, 2));
      },
    },

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

const BOOT_MANIFEST_PATH = path.join(dirname, 'boot-manifest.json');

/**
 * Normalize a rolldown module id to its manifest form: repo-relative, query stripped.
 * Returns `null` for ids that must never be grouped (virtual modules, and app-own source —
 * capturing an entry module dissolves its facade chunk and degrades the HTML output).
 */
function toManifestId(moduleId: string): string | null {
  if (moduleId.includes('\0') || moduleId.includes('/packages/apps/')) {
    return null;
  }
  const cleaned = moduleId.split('?')[0];
  return cleaned.startsWith(rootDir) ? cleaned.slice(rootDir.length + 1) : cleaned;
}

// Regeneration is an explicit mode: it disables the boot group (so the build's chunk graph
// is the pure ungrouped one) and rewrites the manifest from it. Normal builds only consume.
// This split exists because a manifest written from a *grouped* build ratchets: grouping a
// module into a boot chunk makes it chunk-reachable, so any contamination self-perpetuates.
const isManifestRegen = isTrue(process.env.DX_BOOT_MANIFEST_REGEN);

// Manifest v2: modules pre-partitioned into chunks along cycle-safe boundaries. Buckets are
// contiguous ranges of a dependency-first topological order of the module graph's SCC
// condensation, so every cross-chunk import points to an earlier chunk — the chunk DAG is
// acyclic by construction and native ESM evaluation order stays correct without
// strictExecutionOrder (whose module wrapping costs ~+1.8MB of inhibited treeshaking here).
const bootPartition: Map<string, number> = (() => {
  if (isManifestRegen) {
    return new Map();
  }
  try {
    const manifest = JSON.parse(readFileSync(BOOT_MANIFEST_PATH, 'utf-8'));
    return new Map(Object.entries(manifest.partition as Record<string, number>));
  } catch {
    return new Map();
  }
})();

function bootGroupName(moduleId: string, ctx: any): string | null {
  reportBootDivergence(ctx);
  const id = toManifestId(moduleId);
  if (id === null) {
    return null;
  }
  const group = bootPartition.get(id);
  return group === undefined ? null : `boot-${group}`;
}

/** The page entry whose static closure defines the boot set. */
const BOOT_ENTRY = path.resolve(dirname, 'src/main.tsx');

// Opt-in (DX_BOOT_DIVERGENCE=1): the manifest exists only because the module graph reachable
// at chunking time is PARSE-level, while the boot set is what survives treeshaking — walking
// `importedIds` follows barrel re-exports that treeshaking deletes. Every such divergence is a
// barrel import in boot-reachable code, and eliminating them (per-namespace subpath imports)
// converges the two graphs; at zero divergence the partition can be computed in-process and
// this manifest deleted. This report is the work-list and the readiness signal for that.
let divergenceReported = false;

function reportBootDivergence(ctx: any): void {
  if (!isTrue(process.env.DX_BOOT_DIVERGENCE) || divergenceReported || bootPartition.size === 0) {
    return;
  }
  divergenceReported = true;

  const infoCache = new Map<string, any>();
  const infoOf = (moduleId: string) => {
    if (!infoCache.has(moduleId)) {
      infoCache.set(moduleId, ctx.getModuleInfo(moduleId));
    }
    return infoCache.get(moduleId);
  };
  if (!infoOf(BOOT_ENTRY)) {
    console.warn(`boot divergence: entry ${BOOT_ENTRY} not in the module graph.`);
    return;
  }

  // Parse-level static closure of the entry, keeping parent links to attribute each leak.
  const parent = new Map<string, string>();
  const visited = new Set<string>([BOOT_ENTRY]);
  const walk = [BOOT_ENTRY];
  while (walk.length > 0) {
    const from = walk.pop()!;
    for (const dep of infoOf(from)?.importedIds ?? []) {
      if (!visited.has(dep)) {
        visited.add(dep);
        parent.set(dep, from);
        walk.push(dep);
      }
    }
  }

  const bytesByCulprit = new Map<string, { bytes: number; via: string; example: string }>();
  let totalBytes = 0;
  for (const moduleId of visited) {
    const id = toManifestId(moduleId);
    if (id === null || bootPartition.has(id)) {
      continue;
    }
    // Walk back to the last module that is genuinely boot code — the manifest, plus app-own
    // source, which is boot code that `toManifestId` excludes only because entry modules must
    // not be captured into a group. Without the latter, every leak reached through app source
    // walks all the way to the entry and attributes to nothing.
    let node = moduleId;
    let hop = parent.get(node);
    while (hop) {
      const hopId = toManifestId(hop);
      if ((hopId !== null && bootPartition.has(hopId)) || hop.includes('/packages/apps/')) {
        break;
      }
      node = hop;
      hop = parent.get(hop);
    }
    const bytes = infoOf(moduleId)?.code?.length ?? 0;
    totalBytes += bytes;
    const relative = (id: string) => (id.startsWith(rootDir) ? id.slice(rootDir.length + 1) : id);
    const key = hop ? `${relative(hop)} -> ${relative(node)}` : `(entry) -> ${relative(node)}`;
    const entry = bytesByCulprit.get(key) ?? { bytes: 0, via: key, example: id };
    entry.bytes += bytes;
    bytesByCulprit.set(key, entry);
  }

  const ranked = [...bytesByCulprit.values()].sort((a, b) => b.bytes - a.bytes);
  console.log(
    `\nboot divergence: ${(totalBytes / 1024) | 0}KB of parse-reachable source is not in the boot set ` +
      `(${ranked.length} leaking imports). Each is a barrel import in boot code:`,
  );
  for (const { bytes, via, example } of ranked.slice(0, 20)) {
    console.log(`  ${String((bytes / 1024) | 0).padStart(6)}KB  ${via}\n            e.g. ${example}`);
  }
  console.log('');
}

/** Target rendered (pre-minify) bytes per boot chunk; ~1.5MB rendered ≈ 400-500KB minified. */
const BOOT_CHUNK_TARGET_BYTES = 1.5 * 1024 * 1024;

/**
 * In regen mode (DX_BOOT_MANIFEST_REGEN=1), rewrites boot-manifest.json: the modules of the
 * chunks statically reachable from the `main` entry, partitioned into cycle-safe buckets.
 * Chunk-level inclusion is the post-treeshake truth (the parse-level module graph
 * over-approximates — it reaches every barrel sibling treeshaking prunes); regen mode
 * guarantees the walked graph is ungrouped, which is what makes the chunk walk sound.
 * Ordering edges come from the parse-level graph — a superset of the true edges, which only
 * over-constrains the order (safe).
 */
function bootManifestPlugin(): PluginOption {
  return {
    name: 'dxos-boot-manifest',
    apply: 'build',
    generateBundle(this: any, _options: unknown, bundle: Record<string, any>) {
      if (!isManifestRegen) {
        return;
      }
      const byFileName = new Map(Object.values(bundle).map((output: any) => [output.fileName, output]));
      const entry = Object.values(bundle).find(
        (output: any) => output.type === 'chunk' && output.isEntry && output.name === 'main',
      );
      // Worker sub-builds and non-page outputs have no `main` entry — leave the manifest alone.
      if (!entry) {
        return;
      }
      const seenChunks = new Set<string>([entry.fileName]);
      const chunkQueue = [entry.fileName];
      while (chunkQueue.length > 0) {
        const chunk = byFileName.get(chunkQueue.shift()!);
        if (!chunk || chunk.type !== 'chunk') {
          continue;
        }
        for (const dep of chunk.imports ?? []) {
          if (!seenChunks.has(dep)) {
            seenChunks.add(dep);
            chunkQueue.push(dep);
          }
        }
      }

      // Boot module set with rendered sizes, keyed by raw id (edges need raw ids).
      const rendered = new Map<string, number>();
      for (const fileName of seenChunks) {
        const chunk = byFileName.get(fileName);
        if (chunk?.type !== 'chunk') {
          continue;
        }
        for (const [moduleId, moduleInfo] of Object.entries<any>(chunk.modules ?? {})) {
          if (toManifestId(moduleId) !== null) {
            rendered.set(moduleId, moduleInfo?.renderedLength ?? 0);
          }
        }
      }

      // Ordering edges between boot modules, with paths THROUGH non-boot modules (virtuals,
      // react, app source) collapsed into direct edges — a boot module that imports a boot
      // module via an intermediary still constrains evaluation order, and dropping such
      // edges let the partition manufacture chunk cycles through the intermediary's chunk.
      const reachableBoot = new Map<string, string[]>();
      const bootTargetsOf = (start: string): string[] => {
        const cached = reachableBoot.get(start);
        if (cached) {
          return cached;
        }
        const targets = new Set<string>();
        const visited = new Set<string>([start]);
        const walk = [...(this.getModuleInfo(start)?.importedIds ?? [])];
        while (walk.length > 0) {
          const dep = walk.pop()!;
          if (visited.has(dep)) {
            continue;
          }
          visited.add(dep);
          if (rendered.has(dep)) {
            targets.add(dep);
            continue;
          }
          walk.push(...(this.getModuleInfo(dep)?.importedIds ?? []));
        }
        const result = [...targets];
        reachableBoot.set(start, result);
        return result;
      };

      // Iterative Tarjan SCC over the boot subgraph. Emission order is dependency-first
      // (an SCC pops only after every SCC it depends on), so contiguous buckets over that
      // order can only import from earlier buckets — the chunk DAG stays acyclic.
      const edges = new Map<string, string[]>();
      for (const moduleId of rendered.keys()) {
        edges.set(moduleId, bootTargetsOf(moduleId));
      }
      const sccOrder: string[][] = [];
      const index = new Map<string, number>();
      const lowlink = new Map<string, number>();
      const onStack = new Set<string>();
      const stack: string[] = [];
      let counter = 0;
      const strongconnect = (root: string) => {
        const work: [string, number][] = [[root, 0]];
        while (work.length > 0) {
          const frame = work[work.length - 1];
          const [node, edgeIdx] = frame;
          if (edgeIdx === 0) {
            index.set(node, counter);
            lowlink.set(node, counter);
            counter++;
            stack.push(node);
            onStack.add(node);
          }
          const deps = edges.get(node) ?? [];
          if (edgeIdx < deps.length) {
            frame[1]++;
            const dep = deps[edgeIdx];
            if (!index.has(dep)) {
              work.push([dep, 0]);
            } else if (onStack.has(dep)) {
              lowlink.set(node, Math.min(lowlink.get(node)!, index.get(dep)!));
            }
          } else {
            if (lowlink.get(node) === index.get(node)) {
              const component: string[] = [];
              for (;;) {
                const popped = stack.pop()!;
                onStack.delete(popped);
                component.push(popped);
                if (popped === node) {
                  break;
                }
              }
              sccOrder.push(component);
            }
            work.pop();
            if (work.length > 0) {
              const [parent] = work[work.length - 1];
              lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(node)!));
            }
          }
        }
      };
      for (const moduleId of rendered.keys()) {
        if (!index.has(moduleId)) {
          strongconnect(moduleId);
        }
      }

      // Contiguous size-balanced buckets over the SCC order (an SCC is never split).
      const partition: Record<string, number> = {};
      let bucket = 0;
      let bucketBytes = 0;
      for (const component of sccOrder) {
        const componentBytes = component.reduce((sum, moduleId) => sum + (rendered.get(moduleId) ?? 0), 0);
        if (bucketBytes > 0 && bucketBytes + componentBytes > BOOT_CHUNK_TARGET_BYTES) {
          bucket++;
          bucketBytes = 0;
        }
        bucketBytes += componentBytes;
        for (const moduleId of component) {
          partition[toManifestId(moduleId)!] = bucket;
        }
      }

      writeFileSync(BOOT_MANIFEST_PATH, JSON.stringify({ version: 2, partition }, null, 2) + '\n');

      // Report genuine import cycles (SCCs with >1 module): the repo policy is no circular
      // imports, so anything here that isn't a known-cyclic external (effect) is actionable.
      const cycles = sccOrder
        .filter((component) => component.length > 1)
        .map((component) => component.map((moduleId) => toManifestId(moduleId)!).sort());
      writeFileSync(path.join(dirname, 'boot-cycles.json'), JSON.stringify(cycles, null, 2) + '\n');
      console.log(
        `bootManifestPlugin: wrote ${rendered.size} boot modules in ${bucket + 1} buckets to ${BOOT_MANIFEST_PATH}; ` +
          `${cycles.length} import cycles -> boot-cycles.json`,
      );
    },
  };
}

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
