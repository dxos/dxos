//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import react from '@vitejs/plugin-react-swc';
import { join, resolve } from 'path';
import { type InlineConfig, mergeConfig } from 'vite';
import inspect from 'vite-plugin-inspect';
import topLevelAwait from 'vite-plugin-top-level-await';
import turbosnap from 'vite-plugin-turbosnap';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

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
  'devtools/*/src/**',
  'experimental/*/src/**',
  'plugins/*/src/**',
  'sdk/*/src/**',
  'ui/*/src/**',
];

export const stories = modules.map((dir) => join(packages, dir, storyFiles));
export const content = modules.map((dir) => join(packages, dir, contentFiles));

if (isTrue(process.env.DX_DEBUG)) {
  // eslint-disable-next-line no-console
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
  framework: '@storybook/react-vite',
  stories: baseStories ?? stories,
  addons: [
    '@dxos/storybook-addon-logger',
    '@storybook/addon-docs',
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
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ config, options }, null, 2));
    }

    return mergeConfig(config, {
      publicDir: staticDir,
      build: {
        assetsInlineLimit: 0,
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
      worker: {
        format: 'es',
        plugins: () => [wasm(), topLevelAwait()],
      },
      plugins: [
        //
        // NOTE: Order matters.
        //

        // https://www.npmjs.com/package/vite-plugin-wasm
        wasm(),

        // https://www.npmjs.com/package/vite-plugin-top-level-await
        topLevelAwait(),

        // https://www.npmjs.com/package/@vitejs/plugin-react-swc
        react({
          tsDecorators: true,
          plugins: [
            // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
            ['@preact-signals/safe-react/swc', { mode: 'all' }],
          ],
        }),

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
    }) as InlineConfig;
  },
});

const config = createConfig();

if (isTrue(process.env.DX_DEBUG)) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ config }, null, 2));
}

export default config;
