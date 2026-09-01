//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ResolverFactory } from 'oxc-resolver';
// import sourcemaps from 'rollup-plugin-sourcemaps';
import { visualizer } from 'rollup-plugin-visualizer';
import { type ConfigEnv, type PluginOption, type Rollup, defineConfig, searchForWorkspaceRoot } from 'vite';
// import devtoolsJson from 'vite-plugin-devtools-json';
import inspect from 'vite-plugin-inspect';
import { VitePWA } from 'vite-plugin-pwa';
import solid from 'vite-plugin-solid';
import wasm from 'vite-plugin-wasm';

import { bootLoaderPlugin, importMapPlugin } from '@dxos/app-framework/vite-plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { isNonNullable } from '@dxos/util';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';

import { createConfig as createTestConfig } from '../../../vitest.base.config.ts';
import { bootChunking } from './src/vite/boot-chunking.ts';
import { bootMarkPath, channelFaviconPlugin, channelVariant } from './src/vite/channel-branding.ts';
import { debugPortSidecarPlugin, resolveDebugPortSession } from './src/vite/debug-port.ts';
import { optimizeDepsInclude } from './src/vite/optimize-deps.ts';
import { traceBootLeak } from './src/vite/trace-boot-leak.ts';

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFalse = (str?: string) => str === 'false' || str === '0';
const isFastBundle = isTrue(process.env.DX_FASTBUNDLE);
// `DX_PLUGIN_SET=<name>` swaps in that set's definitions at build time (not a runtime flag), so a
// plugin outside the set never enters the bundle. Unset (or unknown) selects the full catalog.
const PLUGIN_SETS: Record<string, string> = {
  production: 'src/plugin-defs.production.tsx',
  mobile: 'src/plugin-defs.mobile.tsx',
};
const pluginSetFile = PLUGIN_SETS[process.env.DX_PLUGIN_SET ?? ''] ?? 'src/plugin-defs.tsx';
// Non-empty only when a dev server is launched with the debug-port flag; see `src/vite/debug-port.ts`.
const debugPortSession = resolveDebugPortSession();
const isReducedPluginSet = pluginSetFile !== 'src/plugin-defs.tsx';

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');
const extendedIcons = path.join(rootDir, '/packages/ui/ui-icons/assets');

const dirname = import.meta.dirname;

// Boot-path chunk grouping; `entry` is the page whose static closure defines the boot set.
const boot = bootChunking({ entry: path.resolve(dirname, 'src/main.tsx') });

// These packages' `browser`-conditioned entrypoints initialize their wasm with top-level await.
// Besides its bundle cost, top-level await is what trips WebKit's out-of-order evaluation under
// concurrent dynamic imports before Safari 27 (TDZ, "undefined is not an object" at plugin
// activation: https://bugs.webkit.org/show_bug.cgi?id=242740, fixed by the module-loader rewrite
// in https://github.com/WebKit/WebKit/pull/57827). Resolving to `slim` and initializing explicitly
// per realm via `initAutomergeWasm()` before the client boots avoids both.
const SLIM_WASM_PACKAGES = ['@automerge/automerge', '@automerge/automerge-repo', '@automerge/automerge-subduction'];

/**
 * Resolves {@link SLIM_WASM_PACKAGES} to `slim`, and their subpaths without the `browser`
 * condition — subduction's `browser`-conditioned `/slim` is still the top-level-await bundler
 * glue, so pinning the non-browser resolution keeps one wasm instance shared by every importer.
 */
const slimWasm = (): PluginOption => {
  // `browser` is deliberately absent; the rest mirrors what vite would apply for the client.
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
        if (!importer) {
          return null;
        }
        const pkg = SLIM_WASM_PACKAGES.find((name) => source === name || source.startsWith(`${name}/`));
        if (!pkg) {
          return null;
        }
        // automerge-repo is redirected only at build: a serve-time redirect would hand out a raw
        // `/@fs` path that bypasses its optimizer chunk, and repo's dist imports CJS deps
        // (`debug`, …) that only the prebundle's ESM interop makes importable. The prebundled
        // fullfat chunk's automerge/subduction imports are externalized and still land here.
        if (pkg === '@automerge/automerge-repo' && !isBuild) {
          return null;
        }
        // Subpaths resolve as requested (`/slim`, `/slim/next`); asset requests (`?url`) fail the
        // resolver and fall through to vite.
        const target = source === pkg ? `${pkg}/slim` : source;
        const resolved = resolver.sync(path.dirname(importer), target);
        return resolved.error || !resolved.path ? null : resolved.path;
      },
    },
  };
};

/**
 * Transpile targets for oxc (dev) and Rolldown (build).
 */
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'] as const;

/**
 * Glob matching the entry of every plugin the selected set can reach, for optimize-deps scanning.
 * Derived from the set's own sources so adding a plugin to it needs no edit here; a specifier scan
 * is enough because a missed plugin costs a "discovered new dependencies" reload rather than a wrong
 * build.
 */
const reducedPluginEntries = () => {
  const names = new Set<string>();
  for (const file of [pluginSetFile, 'src/plugin-defs.core.tsx']) {
    const source = readFileSync(path.join(dirname, file), 'utf8');
    for (const [, name] of source.matchAll(/@dxos\/plugin-([a-z0-9-]+)/g)) {
      names.add(name);
    }
  }
  return path.resolve(rootDir, `packages/plugins/plugin-{${[...names].sort().join(',')}}/src/index.{ts,tsx}`);
};

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
  // Packages whose source is not vite-safe publish no `source` condition at all, so they resolve
  // to dist here exactly as they do under node/bun — no app-local exclude list, and no divergence
  // between runtimes. The `dist-runtime` moon tag keeps their dist built for `serve`. The same
  // holds per-export for bundler-plugin entrypoints (`./vite-plugin`, `./plugin`) of packages whose
  // remaining exports are vite-safe; the `vite-plugin` tag builds their dist.
  importSource({
    include: isFastBundle ? ['#*'] : ['@dxos/**', '#*'],
  }),
  // WebKit evaluates a module before its dependencies when a graph reached by concurrent dynamic
  // imports contains top-level await, leaving bindings in TDZ.
  slimWasm(),
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
    // Hardcoded empty for `build`: the port is arbitrary eval and must not reach a deployed origin.
    __DX_DEBUG_PORT_SESSION__: JSON.stringify(env.command === 'serve' ? debugPortSession : ''),
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
        './src/workers/log-writer-worker.ts',
        `./${pluginSetFile}`,
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
        // Chunk grouping: React pinned, and the boot path collapsed from ~520 default-split
        // chunks into a handful via `bootChunking`. Coarser inference was measured and
        // rejected (2026-08): per-package groups welded each package's eager and lazy halves
        // (boot 4.03->10.07MB), and `$initial` tags span all five HTML entries plus their
        // recursive dependencies (boot ->19MB).
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/]react(-dom)?[\\/]/, priority: 10 },
            // Naive maxSize splitting cuts through module cycles and breaks evaluation
            // order (rolldown#8803); the fix rolldown offers (strictExecutionOrder) costs
            // ~+1.8MB of inhibited treeshaking. Instead the manifest carries a cycle-safe
            // partition (see `boot-chunking.ts`) and each bucket becomes its own chunk.
            {
              name: boot.groupName,
              includeDependenciesRecursively: false,
              priority: 5,
            },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    // The wasm packages `slimWasm` redirects must not be pre-bundled: the optimizer resolves
    // with its own pipeline (the `browser` condition, so the bundler entry) and importers would
    // land on that chunk's top-level await regardless of what the plugin resolves. automerge-repo
    // is deliberately NOT excluded: it has CJS deps (`debug`, …) that need the prebundle's ESM
    // interop, and its prebundled chunk's externalized automerge/subduction imports still resolve
    // through `slimWasm` at serve time.
    exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
    // The full set of dep entrypoints the app reaches, so vite's optimize-deps phase pre-bundles
    // them up front rather than discovering them mid-load (when a dynamic import unwraps a new
    // subpath), which forces a full page reload with the "Discovered new dependencies" banner —
    // ~10 s of wasted dev time per cycle and the most common cause of HMR appearing to hang.
    //
    // The list is static rather than left to the `entries` scan below because vite runs that scan
    // only when there is no valid optimizer cache: once a cache exists it is trusted wholesale, so
    // a cache built by a session that never opened a given plugin stays permanently short of that
    // plugin's deps and re-optimizes on first use, session after session. `include` is part of the
    // cache's config hash, so regenerating this list also invalidates the cache it feeds.
    //
    // Regenerate with `moon run composer-app:gen-optimize-deps`.
    //
    // Entries must resolve from this app's root, which is why deps reached only through `@dxos/*`
    // packages (@automerge/*, @atlaskit/pragmatic-drag-and-drop*, @opentelemetry/*, xstate, …) are
    // also listed as direct deps of composer-app in package.json. An entry that stops resolving
    // costs a warning per start, not a failed scan.
    //
    // A reduced `DX_PLUGIN_SET` keeps the scan instead: the list covers the full registry, and
    // pre-bundling all of it is the cost those sets exist to avoid.
    include: isReducedPluginSet ? undefined : optimizeDepsInclude,
    // Scan the auxiliary HTML entrypoints during pre-bundle so navigations
    // to `internal.html` / `devtools.html` / `reset.html` don't trip a
    // "discovered new dependencies" reload mid-session.
    //
    // Additionally, point the scanner at every plugin's entry files. Plugins
    // are loaded via `await import(...)` at runtime so their bare-module
    // imports aren't reachable from the static graph rooted at `index.html` —
    // Vite would discover them mid-session and trigger a re-optimize + full
    // page reload per plugin family. Walking the entries at startup catches
    // whatever `include` above has drifted away from, and is what
    // `gen-optimize-deps` regenerates that list from. Production bundling is
    // unaffected: Rolldown still emits a separate chunk per dynamic import.
    entries: [
      './index.html',
      './internal.html',
      './devtools.html',
      './reset.html',
      './recovery.html',
      // Under a reduced DX_PLUGIN_SET, scan only the plugins that set can reach, read from its
      // sources themselves — the hand-maintained list this replaces had drifted from them
      // (missing `tasks`/`progress`, still naming a removed `outliner`).
      isReducedPluginSet ? reducedPluginEntries() : path.resolve(rootDir, 'packages/plugins/*/src/index.{ts,tsx}'),
    ],
  },
  resolve: {
    // NOTE: Under Vite 8 / rolldown, string-keyed aliases are treated as prefix matches, which means
    // a bare `util` alias also rewrites `util/types` → `@dxos/node-std/util/types` (not exported).
    // Use regex `find: /^util$/` (array form) to bind the bare module name only and let Vite's
    // native node: polyfill layer handle subpaths like `node:util/types`.
    alias: [
      // Applies to `build` as much as `serve`: this alias is the whole mechanism by which a reduced
      // set's module graph never reaches a plugin outside it.
      ...(isReducedPluginSet ? [{ find: /^\.\/plugin-defs$/, replacement: path.resolve(dirname, pluginSetFile) }] : []),
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
    traceBootLeak(path.resolve(dirname, 'src/main.tsx')),
    ShutdownPlugin(),
    ...sharedPlugins(env),

    // Hosts the Claude Agent SDK in the dev server, so the app reaches it same-origin. Dev only —
    // a deployed Composer has no vite server, and needs the standalone managed process instead.
    // Turns are confined to DX_AGENT_CWD (default: the workspace root); the host refuses any
    // requested directory outside it.
    {
      name: 'dx-agent-claude',
      apply: 'serve',
      // Imported dynamically so only `serve` pays for it: a static import would load the agent SDK
      // whenever this config is evaluated, including every `vite build` and `vite preview`.
      configureServer: async (server) => {
        const { Middleware } = await import('@dxos/agent-claude');
        server.middlewares.use(Middleware.make({ cwd: process.env.DX_AGENT_CWD ?? rootDir }));
      },
    },

    // Hosts the computer harness's shell route against the vite process cwd. Imported dynamically
    // because this config's static imports are bundled as CJS `require` and the package is ESM-only.
    import('@dxos/plugin-computer/vite-plugin').then(({ ComputerShellPlugin }) => ComputerShellPlugin()),

    // RSS proxy middleware for CORS-free feed fetching.
    {
      name: 'rss-proxy',
      configureServer(server) {
        server.middlewares.use('/api/rss', async (req, res) => {
          if (!req.url) {
            res.statusCode = 400;
            res.end('Missing request URL');
            return;
          }
          const url = new URL(req.url, `http://${req.headers.host}`);
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

    // Dev-only: publish the debug-port session id for an agent that cannot read this process's env.
    debugPortSidecarPlugin(debugPortSession, rootDir),

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
    boot.plugin,

    // Hand the boot loader the Composer brand mark so the visual identity
    // is established before any JS bundle parses. The SVG carries its own
    // brand-palette fills (no `currentColor` reliance) and ships as ~2 KB of
    // inline markup. Wrapped in try/catch so an asset rename or move only
    // loses the brand mark — the loader still renders the bar + status
    // without it.
    bootLoaderPlugin({
      markSvg: (() => {
        // A prerelease bundle brands its own; production and any dev server get the released mark.
        const markPath =
          bootMarkPath(dirname, channelVariant(env.command)) ??
          path.join(rootDir, 'packages/ui/brand/assets/icons/composer-icon.svg');
        try {
          return readFileSync(markPath, 'utf8');
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`bootLoaderPlugin: composer brand mark not found at ${markPath}; running without mark.`, error);
          return undefined;
        }
      })(),
    }),

    channelFaviconPlugin(dirname, channelVariant(env.command)),

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
        // The Phosphor catalog (~9,000 SVGs in /phosphor/) is deliberately NOT precached: the
        // manifest entries alone would add one install-time request per file, slowing every
        // install/update. sw.ts caches /phosphor/ fetches at runtime (cache-first) instead,
        // so any icon the app has rendered once stays available offline.
        globIgnores: ['**/phosphor/**'],
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
      // Built rather than written out: `ph` carries every weight while `dx` and `px` are regular-only.
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
        path.join(rootDir, '/{packages,tools}/**/dx.config.{ts,tsx,js,jsx}'),
      ],
      // Keeps every `PxIcons` entry in the sprite so the app paints without a round trip.
      scanPaths: [path.join(rootDir, '/packages/ui/ui-icons/src/index.ts')],
      // Serves both catalogs so `@dxos/react-ui`'s resolver can fetch a glyph the scanner never saw.
      assets: [
        { route: '/phosphor', dir: phosphorIconsCore },
        { route: '/px-icons', dir: extendedIcons },
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
function chunkFileNames(chunkInfo: Rollup.PreRenderedChunk) {
  if (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.match(/index\.[^/]+$/gm)) {
    let segments: string[] = chunkInfo.facadeModuleId.split('/').reverse().slice(1);
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
