//
// Copyright 2023 DXOS.org
// This file has been automatically migrated to valid ESM format by Storybook.
//

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type StorybookConfig } from '@storybook/react-vite';
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

const baseDir = resolve(__dirname, '../');
const rootDir = resolve(baseDir, '../../');
const staticDir = resolve(baseDir, './static');
const iconsDir = resolve(rootDir, 'node_modules/@phosphor-icons/core/assets');

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
  'ui/primitives/*/src/**',
];

// NOTE: Storybook test depends on relative paths.
export const stories = modules.map((dir) => join('../../../packages', dir, storyFiles));
export const content = modules.map((dir) => join(packages, dir, contentFiles));

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
  staticDirs: [staticDir],
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

    const finalConfig = mergeConfig(
      {
        ...config,
        // Prevent duplicate React plugins from the Storybook + DXOS merge.
        plugins: config.plugins?.filter((plugin) =>
          Array.isArray(plugin)
            ? plugin.findIndex(
                (p) =>
                  p &&
                  'name' in p &&
                  (p.name === 'vite:react-swc' || p.name === 'vite:react-babel'),
              ) === -1
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
            util: '@dxos/node-std/util',
            'node:crypto': '@dxos/node-std/crypto',
            crypto: '@dxos/node-std/crypto',
            // Storybook builds from source; ensure worker entrypoints resolve without `dist/` artifacts.
            '@dxos/client/opfs-worker': resolve(rootDir, 'packages/sdk/client/src/worker/opfs-worker.ts'),
          },
        },
        build: {
          assetsInlineLimit: 0,
          // Target modern browsers that support top-level await natively.
          target: ['chrome108', 'edge107', 'firefox104', 'safari16'],
          rollupOptions: {
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

          IconsPlugin({
            assetPath: (name, variant) =>
              `${iconsDir}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
            contentPaths: content,
            spriteFile: 'icons.svg',
            symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
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
