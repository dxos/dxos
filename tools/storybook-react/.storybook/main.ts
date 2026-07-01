//
// Copyright 2023 DXOS.org
// This file has been automatically migrated to valid ESM format by Storybook.
//

import { parse } from '@babel/parser';
import { type StorybookConfig } from '@storybook/react-vite';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type InlineConfig, type Plugin } from 'vite';
import turbosnap from 'vite-plugin-turbosnap';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isTrue = (str?: string) => str === 'true' || str === '1';
const isFastBundle = isTrue(process.env.DX_FASTBUNDLE);

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
          alias: {
            'node-fetch': 'isomorphic-fetch',
            'tiktoken/lite': resolve(__dirname, './stub.mjs'),
            'node:util': '@dxos/node-std/util',
            'util': '@dxos/node-std/util',
            'node:crypto': '@dxos/node-std/crypto',
            'crypto': '@dxos/node-std/crypto',
            // Storybook builds from source; ensure worker entrypoints resolve without `dist/` artifacts.
            '@dxos/client/opfs-worker': resolve(rootDir, 'packages/sdk/client/src/worker/opfs-worker.ts'),
          },
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

          fixAsyncEsmWrappers(),

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

          !isFastBundle &&
            importSource({
              // Include `#*` so Node subpath imports (e.g. `#translations`, `#meta`)
              // resolve to the `source` condition (`./src/...`) instead of falling
              // through to `default` (`./dist/lib/neutral/...`). Without this, a
              // package's own `test-storybook` task fails when its `compile` task
              // hasn't been triggered as an upstream dep — manifests as
              // `[vite] Failed to resolve import "#translations"`.
              include: ['@dxos/**', '#*'],
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

const FUNCTION_NODE_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/**
 * Re-add the `async` keyword to lazy `__esm`/`__esmMin` init wrappers that rolldown emits without
 * it. Vite 8 / rolldown's wrapped-ESM codegen drops `async` from the init thunk generated for a
 * module that awaits a transitive top-level await — the `@automerge/automerge-subduction` WASM
 * init, reached by most stories — leaving a bare `await` inside a synchronous function. The browser
 * then throws a parse-time "await is a reserved identifier" SyntaxError for the whole chunk, which
 * surfaces as the Storybook render error on most stories. composer-app sidesteps this by running
 * echo-host in a worker; the storybook bundle pulls the same graph into the page, so the wrappers
 * are generated here and must be patched. The runtime helper invokes the thunk and returns its
 * result (callers already `await init_X()`), so flipping the broken thunks to `async` is exactly the
 * shape rolldown intended — a function whose body contains `await` is only valid when `async`.
 * Workaround for the rolldown regression tracked in https://github.com/rolldown/rolldown/issues/3686;
 * remove once the bundled rolldown ships the fix.
 */
const fixAsyncEsmWrappers = (): Plugin => ({
  name: 'dxos:fix-async-esm-wrappers',
  // `renderChunk` sees the already-emitted (and invalid) chunk. The bare `await` sits inside a
  // synchronous function, which no standard parser accepts (acorn's `allowAwaitOutsideFunction`
  // only permits module-scope await), so parse with Babel's `errorRecovery` to still build the AST.
  renderChunk(code) {
    if (!code.includes('await')) {
      return null;
    }

    let ast;
    try {
      ast = parse(code, { sourceType: 'module', errorRecovery: true });
    } catch {
      return null;
    }

    // Offsets of non-async functions whose own body contains a top-level `await`.
    const starts = new Set<number>();
    const visit = (node: any, enclosingFn: any) => {
      if (!node || typeof node.type !== 'string') {
        return;
      }
      const fn = FUNCTION_NODE_TYPES.has(node.type) ? node : enclosingFn;
      if (node.type === 'AwaitExpression' && fn && !fn.async && typeof fn.start === 'number') {
        starts.add(fn.start);
      }
      for (const key in node) {
        // Skip metadata keys (positions, comments, tokens, recovered errors) — not AST children.
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
          continue;
        }
        if (key === 'comments' || key === 'tokens' || key === 'errors' || key.endsWith('Comments')) {
          continue;
        }
        const value = node[key];
        if (Array.isArray(value)) {
          for (const child of value) {
            visit(child, fn);
          }
        } else if (value && typeof value.type === 'string') {
          visit(value, fn);
        }
      }
    };
    visit(ast, null);

    if (starts.size === 0) {
      return null;
    }

    // Splice from the highest offset down so earlier offsets stay valid.
    let patched = code;
    for (const start of [...starts].sort((a, b) => b - a)) {
      patched = `${patched.slice(0, start)}async ${patched.slice(start)}`;
    }
    return { code: patched, map: null };
  },
});

const config = createConfig();

if (isTrue(process.env.DX_DEBUG)) {
  console.log(JSON.stringify({ config }, null, 2));
}

export default config;
