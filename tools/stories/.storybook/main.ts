//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import ReactPlugin from '@vitejs/plugin-react';
import flatten from 'lodash.flatten';
import { join, resolve } from 'path';
import { type InlineConfig, mergeConfig } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import TurbosnapPlugin from 'vite-plugin-turbosnap';
import WasmPlugin from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

export const packages = resolve(__dirname, '../../../packages');
const phosphorIconsCore = resolve(__dirname, '../../../node_modules/@phosphor-icons/core/assets');

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
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    'storybook-dark-mode',
  ],
  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config, { configType }) => {
    if (process.env.DX_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ config, configType }, null, 2));
    }

    return mergeConfig(
      configType === 'PRODUCTION'
        ? {
            ...config,
            // TODO(thure): build fails for @preact/signals-react: https://github.com/preactjs/signals/issues/269
            plugins: flatten(config.plugins).map((plugin: any) => {
              return plugin.name === 'vite:react-babel'
                ? ReactPlugin({
                    jsxRuntime: 'classic',
                  })
                : plugin.name === 'vite:react-jsx'
                  ? undefined
                  : plugin;
            }),
          }
        : config,
      {
        // When `jsxRuntime` is set to 'classic', top-level awaits are rejected unless build.target is 'esnext'
        ...(configType === 'PRODUCTION' && { build: { target: 'esnext' } }),
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
          IconsPlugin({
            symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
            assetPath: (name, variant) =>
              `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
            spriteFile: 'icons.svg',
            contentPaths: [join(packages, '/**/src/**/*.{ts,tsx}')],
          }),
          ThemePlugin({
            root: __dirname,
            content: [
              join(packages, '/*/*/src/**/*.css'),
              join(packages, '/*/*/src/**/*.{ts,tsx,js,jsx}'),
              join(packages, '/plugins/*/src/**/*.{ts,tsx,js,jsx}'),
              join(packages, '/plugins/experimental/*/src/**/*.{ts,tsx,js,jsx}'),
            ],
          }),
          TopLevelAwaitPlugin(),
          TurbosnapPlugin({ rootDir: turbosnapRootDir ?? config.root ?? __dirname }),
          WasmPlugin(),
        ],
      } satisfies InlineConfig,
    );
  },
  ...baseConfig,
});
