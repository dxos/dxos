//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import ReactPlugin from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { type InlineConfig, mergeConfig } from 'vite';
import InspectPlugin from 'vite-plugin-inspect';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import TurbosnapPlugin from 'vite-plugin-turbosnap';
import WasmPlugin from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

export const packages = resolve(__dirname, '../../../packages');
const phosphorIconsCore = resolve(__dirname, '../../../node_modules/@phosphor-icons/core/assets');

const isTrue = (str?: string) => str === 'true' || str === '1';
const contentFiles = '*.{ts,tsx,js,jsx,css}';

/**
 * https://storybook.js.org/docs/configure
 * https://storybook.js.org/docs/api/main-config/main-config
 * https://nx.dev/recipes/storybook/one-storybook-for-all
 */
export const config = (
  baseConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>,
  turbosnapRootDir?: string,
): StorybookConfig => ({
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: true,
    },
  },
  typescript: {
    // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories.
    reactDocgen: false,
  },
  addons: [
    // Please do not disable `addon-essentials` for all stories if one story is crashing due to an infinite loop.
    // Set `controls: { disable: true }` in the story’s parameters, or set `argTypes` that works for your story instead
    // of relying on Storybook’s automatic analysis in these cases. See also: https://github.com/storybookjs/storybook/issues/17098
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    'storybook-dark-mode',
    '@dxos/theme-editor-addon',
  ],
  ...baseConfig,

  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config, { configType }) => {
    if (process.env.DX_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ config, configType }, null, 2));
    }

    return mergeConfig(config, {
      publicDir: resolve(__dirname, '../static'),
      build: {
        assetsInlineLimit: 0,
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[hash][extname]', // Unique asset names
          },
        },
      },
      // TODO(burdon): Disable overlay error (e.g., "ESM integration proposal for Wasm" is not supported currently.")
      server: {
        headers: {
          'Cache-Control': 'no-store',
        },
        hmr: {
          overlay: false,
        },
      },
      worker: {
        format: 'es',
        plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
      },
      plugins: [
        // https://github.com/antfu-collective/vite-plugin-inspect#readme
        // Open: http://localhost:5173/__inspect
        isTrue(process.env.DX_INSPECT) && InspectPlugin(),
        ReactPlugin({
          tsDecorators: true,
          plugins: [
            // https://github.com/XantreDev/preact-signals/tree/main/packages/react#how-parser-plugins-works
            ['@preact-signals/safe-react/swc', { mode: 'all' }],
          ],
        }),
        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
          spriteFile: 'icons.svg',
          contentPaths: [resolve(packages, '**/src/**', contentFiles)],
        }),
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(packages, 'app/*/src/**', contentFiles),
            resolve(packages, 'experimental/*/src/**', contentFiles),
            resolve(packages, 'plugins/*/src/**', contentFiles),
            resolve(packages, 'sdk/*/src/**', contentFiles),
            resolve(packages, 'ui/*/src/**', contentFiles),
          ],
        }),
        TopLevelAwaitPlugin(),
        TurbosnapPlugin({ rootDir: turbosnapRootDir ?? config.root ?? __dirname }),
        WasmPlugin(),
      ],
    } satisfies InlineConfig);
  },
});
