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
    const { default: react } = await import('@vitejs/plugin-react-swc');
    const { mergeConfig } = await import('vite');
    const { default: inspect } = await import('vite-plugin-inspect');

    const finalConfig = mergeConfig(
      {
        ...config,
        // Prevent duplicate react-swc plugin.
        plugins: config.plugins?.filter((plugin) =>
          Array.isArray(plugin)
            ? plugin.findIndex((p) => p && 'name' in p && p?.name === 'vite:react-swc') === -1
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
          exclude: ['@dxos/wa-sqlite'],
        },
        worker: {
          format: 'es',
          plugins: () => [wasm()],
        },
        plugins: [
          //
          // NOTE: Order matters.
          //

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

          // https://www.npmjs.com/package/@vitejs/plugin-react-swc
          react({ tsDecorators: true }),

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

          ThemePlugin({
            root: __dirname,
            content,
          }),
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
