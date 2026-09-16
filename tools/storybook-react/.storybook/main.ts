//
// Copyright 2023 DXOS.org
// This file has been automatically migrated to valid ESM format by Storybook.
//

import { type StorybookConfig } from '@storybook/react-vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type InlineConfig } from 'vite';
import turbosnap from 'vite-plugin-turbosnap';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFastBundle = isTrue(process.env.DX_FASTBUNDLE);

// Single-pass `vitest run` (not `vitest watch`); `VITEST` is set in both and `VITEST_MODE` is
// worker-only, so read the run subcommand (first positional token, not any `run`-named filter).
const vitestSubcommand = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const isVitest = isTrue(process.env.VITEST);
const isVitestRun = isVitest && (vitestSubcommand === 'run' || process.argv.includes('--run'));

// Browsers targeted for syntax transforms (also applied to `oxc` below so that dev-server
// transforms downlevel syntax WebKit doesn't parse yet, e.g. `using`/`await using`).
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'];

const baseDir = resolve(__dirname, '../');
const rootDir = resolve(baseDir, '../../');
const staticDir = resolve(baseDir, './static');

/** Root that Claude Agent SDK turns are confined to; unset leaves the agent host unmounted. */
const agentCwd = process.env.DX_AGENT_CWD;
const iconsDir = resolve(rootDir, 'node_modules/@phosphor-icons/core/assets');
const dxosIconsDir = resolve(rootDir, 'packages/ui/brand/assets/icons');
const extendedIconsDir = resolve(rootDir, 'packages/ui/ui-icons/assets');
// tldraw self-hosts its fonts/icons; plugin-tldraw points tldraw at `/assets/plugin-tldraw` and the
// app serves them via a copy step (see composer-app `copy:assets`). Mirror that here so sketch
// surfaces render (tldraw blocks the editor behind an asset preload).
const sketchAssetsDir = resolve(rootDir, 'packages/plugins/plugin-tldraw/dist/assets');

export const packages = resolve(rootDir, 'packages');
export const storyFiles = '*.{mdx,stories.tsx}';
export const contentFiles = '*.{ts,tsx,js,jsx,css}';
export const modules = [
  'apps/*/src/**',
  'common/*/src/**',
  'devtools/*/src/**',
  'experimental/*/src/**',
  'plugins/*/src/**',
  'sdk/*/src/**',
  'stories/*/src/**',
  'ui/*/src/**',
  'ui/react-primitives/*/src/**',
];

/**
 * Comma-separated package directories (relative to `packages/`, e.g.
 * `ui/react-ui-task,plugins/plugin-projects`) to serve stories from; unset serves every package.
 *
 * Serving the whole monorepo from source is what makes a long editing session brittle: each newly
 * crawled dependency makes Vite re-optimize and force a reload, which is what fails an in-flight
 * story with "Failed to fetch dynamically imported module". Narrowing the set while working in one
 * or two packages keeps source HMR (unlike `serve-fast`, which resolves `@dxos/**` from dist).
 */
const storyDirs = process.env.DX_STORIES?.split(',')
  .map((entry) =>
    entry
      .trim()
      .replace(/^packages\//, '')
      .replace(/\/+$/, ''),
  )
  .filter(Boolean);

// NOTE: Storybook test depends on relative paths.
export const stories = (storyDirs?.length ? storyDirs.map((dir) => `${dir}/src/**`) : modules).map((dir) =>
  join('../../../packages', dir, storyFiles),
);
// Not narrowed by `DX_STORIES`: a served story renders components from packages outside the filter,
// and every icon they reference has to be in the sprite.
export const content = [
  ...modules.map((dir) => join(packages, dir, contentFiles)),
  join(packages, '**/dx.config.{ts,tsx,js,jsx}'),
];

if (isTrue(process.env.DX_DEBUG)) {
  console.log(JSON.stringify({ stories, content }, null, 2));
}

/**
 * Externals pre-bundled ahead of the crawler under `DX_FASTBUNDLE`.
 *
 * Vite resolves these from this package's own root, so only its direct dependency graph can be
 * named here. The heavy libraries this list once also carried — codemirror, radix, automerge,
 * atlaskit, `@effect/platform` — belong to the individual story packages, not to storybook-react;
 * under pnpm's strict layout they never resolved, so Vite skipped all 30 with a "Failed to resolve
 * dependency" warning. The cold-start scan covers them instead: it crawls every story file and
 * finds ~450 deps unaided.
 */
const optimizeDepsInclude = [
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
];

/**
 * Paths the dev server must not watch, appended to Vite's own defaults (`.git`, `node_modules`,
 * `test-results`, the cache dir).
 *
 * Storybook resolves `@dxos/**` from source, so build output is not in the module graph — but a
 * `moon run :build` during an editing session still writes thousands of files under these trees,
 * and every write costs a chokidar event on a watcher already spanning the monorepo.
 */
const watchIgnored = ['**/dist/**', '**/out/**', '**/.moon/**', '**/temp/**', '**/.playwright-mcp/**'];

/**
 * Watcher options for the dev server.
 *
 * `useFsEvents: false` is the load-bearing one. Vite inlines a patched chokidar 3 into its own
 * bundle, and chokidar 3's fsevents backend fans every raw event out over one `Set` of listeners
 * per watched tree, each listener re-building `resolvedPath + sep` and running `indexOf` on the
 * event path. Vite registers one listener per file it transforms from outside `root`, and serving
 * every `@dxos/**` package from source puts tens of thousands of files there — measured at 17k
 * listeners on a single tree, ~1.3ms of main-thread time per raw event, and ~4s of blocked event
 * loop for one `moon run <pkg>:build`. `watchIgnored` cannot help: chokidar consults it only when
 * registering a watch, never on the raw-event path. The `fs.watch` backend has no such fan-out.
 *
 * This only changes macOS: chokidar's fsevents backend does not exist elsewhere, so Linux (CI, the
 * e2e config) already runs the `fs.watch` path this selects.
 *
 * `usePolling: false` is not redundant — chokidar 3 turns polling ON by default on macOS whenever
 * `useFsEvents` is false, which would be far worse than what it replaces.
 */
const watchOptions = { ignored: watchIgnored, useFsEvents: false, usePolling: false };

// Minimal structural view of a Babel AST node for a dependency-free traversal.
type AstNode = { type: string } & Record<string, unknown>;

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
]);

// True when `fn` contains an `await` in its own body rather than inside a nested function.
const ownsAwait = (fn: AstNode): boolean => {
  let found = false;
  const scan = (node: AstNode, isRoot: boolean) => {
    if (found || (!isRoot && FUNCTION_NODES.has(node.type))) {
      return;
    }
    if (node.type === 'AwaitExpression') {
      found = true;
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isAstNode(item)) {
            scan(item, false);
          }
        }
      } else if (isAstNode(value)) {
        scan(value, false);
      }
    }
  };
  scan(fn, true);
  return found;
};

/**
 * Repairs a known rolldown codegen bug: when it wraps a module that uses top-level await
 * (e.g. `@automerge/automerge`'s WASM init) in its lazy `__esm` init factory, it emits the
 * `await` but forgets to mark the factory `async`, leaving `await` inside a non-async
 * function. That is invalid JavaScript, so the published bundle throws
 * `SyntaxError: Unexpected reserved word` and every story renders blank. A non-async
 * function that owns an `await` is always malformed, so re-adding the missing `async`
 * only ever touches genuinely broken output. Remove once rolldown ships the upstream fix.
 */
const repairTopLevelAwait = async (code: string): Promise<string | null> => {
  if (!code.includes('await')) {
    return null;
  }
  const { parse } = await import('@babel/parser');
  // `errorRecovery` still throws on unrecoverable syntax; a single such chunk must not
  // fail the whole build, so leave it unmodified rather than propagating out of renderChunk.
  let program: unknown;
  try {
    program = parse(code, { sourceType: 'module', errorRecovery: true }).program;
  } catch (error) {
    console.warn('[dxos:repair-top-level-await] Skipping unparseable chunk.', error);
    return null;
  }
  const positions: number[] = [];
  const walk = (node: AstNode) => {
    if (FUNCTION_NODES.has(node.type) && node.async === false && typeof node.start === 'number' && ownsAwait(node)) {
      positions.push(node.start);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isAstNode(item)) {
            walk(item);
          }
        }
      } else if (isAstNode(value)) {
        walk(value);
      }
    }
  };
  if (isAstNode(program)) {
    walk(program);
  }
  if (positions.length === 0) {
    return null;
  }
  // Insert right-to-left so earlier offsets stay valid.
  positions.sort((left, right) => right - left);
  let repaired = code;
  for (const position of positions) {
    repaired = repaired.slice(0, position) + 'async ' + repaired.slice(position);
  }
  return repaired;
};

/**
 * Storybook and Vite configuration.
 *
 * https://storybook.js.org/docs/configure
 * https://storybook.js.org/docs/api/main-config/main-config
 * https://nx.dev/recipes/storybook/one-storybook-for-all
 */
export const createConfig = ({
  stories: baseStories,
  ...baseConfig
}: Partial<StorybookConfig> = {}): StorybookConfig => ({
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: true,
    },
  },
  stories: baseStories ?? stories,
  addons: [
    '@dxos/storybook-addon-logger',
    // NOTE: Enabling this causes ALL stories to be mounted twice (which sometimes confounds debugging).
    // TODO(burdon): Configure only when running inside manager?
    // '@storybook/addon-docs',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
  ],
  // Per-package storybooks point `configDir` at their own `.storybook`, so the shared manager config
  // (theme, sidebar labels) is only picked up if it is registered as a manager entry here.
  managerEntries: [resolve(__dirname, './manager.tsx')],
  staticDirs: [staticDir, { from: sketchAssetsDir, to: '/assets/plugin-tldraw' }],
  // Suppress Storybook's own promotional UI: the "Learn what's new" release popup and the
  // "Get started" onboarding checklist (sidebar widget and menu guide page).
  core: {
    disableWhatsNewNotifications: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  typescript: {
    // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories.
    reactDocgen: false,
    // skipCompiler: true,
  },
  ...baseConfig,
  logLevel: 'verbose',

  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config: InlineConfig, options: { configType?: string }) => {
    if (isTrue(process.env.DX_DEBUG)) {
      console.log(JSON.stringify({ config, options }, null, 2));
    }

    // A human-driven `storybook dev`, as opposed to `storybook build` or the browser-mode vitest
    // suites. Only the former survives long enough for optimizer churn to matter, and only there is
    // an automatic reload acceptable — under vitest it would sever the test harness's connection.
    const isInteractiveDev = options.configType !== 'PRODUCTION' && !isVitest;

    // NOTE: Dynamic imports seem to help avoid conflicts with storybook's internal esbuild-register usage & Vite 7.
    const { default: react } = await import('@vitejs/plugin-react');
    const { mergeConfig } = await import('vite');
    const { default: inspect } = await import('vite-plugin-inspect');
    const { DxosLogPlugin } = await import('@dxos/vite-plugin-log');

    const finalConfig = mergeConfig(
      {
        ...config,
        // Prevent duplicate react plugin.
        plugins: config.plugins?.filter((plugin) =>
          Array.isArray(plugin)
            ? plugin.findIndex((p) => p && 'name' in p && p?.name === 'vite:react-babel') === -1
            : true,
        ),
      },
      {
        publicDir: staticDir,
        resolve: {
          // NOTE: Under Vite 8 / rolldown, string-keyed aliases are treated as prefix matches, which means
          // a bare `util` alias also rewrites `util/types` → `@dxos/node-std/util/types` (not exported).
          // Use regex `find: /^util$/` (array form) to bind the bare module name only and let Vite's
          // native node: polyfill layer handle subpaths like `node:util/types`.
          alias: [
            { find: /^node-fetch$/, replacement: 'isomorphic-fetch' },
            { find: /^node:util$/, replacement: '@dxos/node-std/util' },
            { find: /^util$/, replacement: '@dxos/node-std/util' },
            { find: /^node:path$/, replacement: '@dxos/node-std/path' },
            { find: /^path$/, replacement: '@dxos/node-std/path' },
            { find: /^node:crypto$/, replacement: '@dxos/node-std/crypto' },
            { find: /^crypto$/, replacement: '@dxos/node-std/crypto' },
            { find: /^node:stream$/, replacement: '@dxos/node-std/stream' },
            { find: /^stream$/, replacement: '@dxos/node-std/stream' },
            { find: /^tiktoken\/lite$/, replacement: resolve(__dirname, './stub.mjs') },
            // Storybook builds from source; ensure worker entrypoints resolve without `dist/` artifacts.
            {
              find: /^@dxos\/client\/opfs-worker$/,
              replacement: resolve(rootDir, 'packages/sdk/client/src/worker/opfs-worker.ts'),
            },
          ],
        },
        // `build.target` only lowers syntax for `storybook build`; the e2e tests run against
        // `storybook dev`, which otherwise serves source syntax untransformed straight to the
        // browser. Setting `oxc.target` applies the same downleveling during dev.
        oxc: {
          target: browserTargets,
        },
        build: {
          assetsInlineLimit: 0,
          // Target modern browsers that support top-level await natively.
          target: browserTargets,
          rolldownOptions: {
            output: {
              assetFileNames: 'assets/[name].[hash][extname]', // Unique asset names
            },
          },
        },
        server: {
          headers: {
            // Prevent caching icon sprite.
            'Cache-Control': 'no-store',
          },
          hmr: {
            // TODO(burdon): Disable overlay error (e.g., "ESM integration proposal for Wasm" is not supported currently.")
            overlay: false,
          },
          // Vite leaks the file watcher's handles on close, hanging single-pass teardown; disable it
          // in run mode only, so interactive `storybook dev` (local + e2e) and `vitest watch` keep HMR.
          ...(isVitestRun ? { watch: null } : { watch: watchOptions }),
        },
        optimizeDeps: {
          // WASM modules.
          exclude: ['@dxos/wa-sqlite', 'manifold-3d'],
          ...(isFastBundle && { include: optimizeDepsInclude }),
          // A re-optimize invalidates every previously issued `?v=<hash>` URL, so a story that is
          // mid dynamic-import when one lands dies with "Failed to fetch dynamically imported
          // module" and renders blank until reloaded by hand. Serving the stale chunk instead lets
          // that import finish; the full reload Vite queues right after replaces it anyway.
          ...(isInteractiveDev && { ignoreOutdatedRequests: true }),
        },
        worker: {
          format: 'es',
          plugins: () => [wasm()],
        },
        plugins: [
          //
          // NOTE: Order matters.
          //

          // RSS proxy middleware for CORS-free feed fetching.
          {
            name: 'rss-proxy',
            configureServer(server: any) {
              server.middlewares.use('/api/rss', async (req: any, res: any) => {
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

          importSource({
            // Always resolve package-internal `#*` subpath imports (e.g. `#translations`,
            // `#meta`) to the `source` condition (`./src/...`); otherwise they fall through
            // to `default` (`./dist/lib/neutral/...`) and fail when a package's `compile` has
            // not run. Fast mode (`DX_FASTBUNDLE`) still needs this — it only wants to skip
            // forcing `@dxos/**` to source (so those resolve from dist and get pre-bundled),
            // NOT the `#*` resolution, which every plugin relies on.
            // Packages whose source is not vite-safe publish no `source` condition at all, so they
            // resolve to dist here just as they do under node/bun — no app-local exclude list.
            include: isFastBundle ? ['#*'] : ['@dxos/**', '#*'],
          }),

          // https://www.npmjs.com/package/vite-plugin-wasm
          wasm(),

          // Repair rolldown's top-level-await codegen only for the production `storybook build`;
          // `storybook dev` serves native ESM where top-level await is legal. See `repairTopLevelAwait`.
          options.configType === 'PRODUCTION' && {
            name: 'dxos:repair-top-level-await',
            renderChunk: async (code: string) => {
              const repaired = await repairTopLevelAwait(code);
              return repaired ? { code: repaired } : null;
            },
          },

          // https://www.npmjs.com/package/@vitejs/plugin-react
          // The oxc-based plugin (not SWC) keeps the React/JSX transform within rolldown's
          // pipeline, aligning with composer-app and composer-crx; this drops storybook-react as a
          // consumer of `@vitejs/plugin-react-swc`.
          react(),

          // https://www.npmjs.com/package/vite-plugin-turbosnap
          turbosnap({
            rootDir: config.root ?? __dirname,
          }),

          // https://www.npmjs.com/package/vite-plugin-inspect
          // Open: http://localhost:5173/__inspect
          isTrue(process.env.DX_INSPECT) && inspect(),

          //
          // Custom DXOS plugins.
          //

          DxosLogPlugin(),

          // Hosts the Claude Agent SDK so stories reach it same-origin. Storybook builds its vite
          // config here and never loads a package's `vite.config.ts`, so a story cannot mount its
          // own host — hence mounting it centrally. Opt-in: the host spawns the SDK and spends real
          // tokens, so it stays absent unless DX_AGENT_CWD names the root to confine turns to.
          agentCwd && {
            name: 'dx-agent-claude',
            apply: 'serve' as const,
            // Imported dynamically: this config is bundled with a CJS `require` for static imports,
            // and `@dxos/agent-claude` is ESM-only.
            configureServer: async (server: { middlewares: { use: (handler: any) => void } }) => {
              const { Middleware } = await import('@dxos/agent-claude');
              server.middlewares.use(Middleware.make({ cwd: agentCwd }));
            },
          },

          IconsPlugin({
            // Built rather than written out: `ph` carries every weight while `dx` and `px` are regular-only.
            symbolPattern: iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] }),
            assetPath: (iconSet, name, variant) => {
              switch (iconSet) {
                case 'dx':
                  return `${dxosIconsDir}/${name}.svg`;
                case 'px':
                  return `${extendedIconsDir}/${name}.svg`;
                default:
                  return `${iconsDir}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
              }
            },
            contentPaths: content,
            // Keeps every `PxIcons` entry in the sprite so stories paint without a round trip.
            scanPaths: [resolve(rootDir, 'packages/ui/ui-icons/src/index.ts')],
            // Only `px` is served: the Phosphor catalog is ~9,000 files, too many to hand to a story.
            assets: [{ route: '/px-icons', dir: extendedIconsDir }],
            spriteFile: 'icons.svg',
          }),

          ThemePlugin({}),
        ],
      },
    ) as InlineConfig;

    return finalConfig;
  },
});

const config = createConfig();

if (isTrue(process.env.DX_DEBUG)) {
  console.log(JSON.stringify({ config }, null, 2));
}

export default config;
