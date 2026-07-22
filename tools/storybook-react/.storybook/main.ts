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
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFastBundle = isTrue(process.env.DX_FASTBUNDLE);

// Single-pass `vitest run` (never `vitest watch`), detected from the CLI invocation because vitest's
// `VITEST_MODE` signal is worker-only. Used to drop the story builder's file watcher, which vite
// leaks on close and otherwise hangs the storybook test teardown. Watch mode keeps the watcher.
const isVitestRun = isTrue(process.env.VITEST) && (process.argv.includes('run') || process.argv.includes('--run'));

// Browsers targeted for syntax transforms (also applied to `oxc` below so that dev-server
// transforms downlevel syntax WebKit doesn't parse yet, e.g. `using`/`await using`).
const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'];

const baseDir = resolve(__dirname, '../');
const rootDir = resolve(baseDir, '../../');
const staticDir = resolve(baseDir, './static');
const iconsDir = resolve(rootDir, 'node_modules/@phosphor-icons/core/assets');
const dxosIconsDir = resolve(rootDir, 'packages/ui/brand/assets/icons');
// tldraw self-hosts its fonts/icons; plugin-sketch points tldraw at `/assets/plugin-sketch` and the
// app serves them via a copy step (see composer-app `copy:assets`). Mirror that here so sketch
// surfaces render (tldraw blocks the editor behind an asset preload).
const sketchAssetsDir = resolve(rootDir, 'packages/plugins/plugin-sketch/dist/assets');

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

// NOTE: Storybook test depends on relative paths.
export const stories = modules.map((dir) => join('../../../packages', dir, storyFiles));
export const content = [
  ...modules.map((dir) => join(packages, dir, contentFiles)),
  join(packages, '**/dx.config.{ts,tsx,js,jsx}'),
];

if (isTrue(process.env.DX_DEBUG)) {
  console.log(JSON.stringify({ stories, content }, null, 2));
}

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
  staticDirs: [staticDir, { from: sketchAssetsDir, to: '/assets/plugin-sketch' }],
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
          // Under `vitest run` the story builder serves in a single pass and never needs the file
          // watcher, but vite leaves its FSEVENTWRAP + file handles open on close, so teardown of a
          // heavy package exceeds the timeout and vitest force-exits non-zero despite all tests
          // passing. Disable the watcher only in that single-pass run (see `IS_VITEST_RUN`); interactive
          // `storybook dev` (local + e2e) and `vitest watch` keep HMR.
          ...(isVitestRun ? { watch: null } : {}),
        },
        optimizeDeps: {
          // WASM modules.
          exclude: ['@dxos/wa-sqlite', 'manifold-3d'],
          ...(isFastBundle && {
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
              // Automerge.
              '@automerge/automerge',
              '@automerge/automerge-repo',
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
              // Atlaskit drag-and-drop.
              '@atlaskit/pragmatic-drag-and-drop',
              '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator',
            ],
          }),
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

          IconsPlugin({
            // The leading negative lookahead restricts the `dx` set to the `regular` weight only
            // (custom brand SVGs have no weight variants); the `ph` set retains all Phosphor weights.
            symbolPattern:
              '(?!dx--[a-z]+[a-z-]*--(?:bold|duotone|fill|light|thin))(ph|dx)--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
            assetPath: (iconSet, name, variant) => {
              switch (iconSet) {
                case 'dx':
                  return `${dxosIconsDir}/${name}.svg`;
                default:
                  return `${iconsDir}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
              }
            },
            contentPaths: content,
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
