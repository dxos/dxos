//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import ReactPlugin from '@vitejs/plugin-react';
import flatten from 'lodash.flatten';
import { resolve } from 'path';
import { type InlineConfig, mergeConfig } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import TurbosnapPlugin from 'vite-plugin-turbosnap';
import WasmPlugin from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

// TODO(burdon): Set auto title (remove need for actual title property).
//  https://storybook.js.org/docs/configure/sidebar-and-urls#csf-30-auto-titles

export const packages = resolve(__dirname, '../../../packages');
const phosphorIconsCore = resolve(__dirname, '../../../node_modules/@phosphor-icons/core/assets');

/**
 * https://nx.dev/recipes/storybook/one-storybook-for-all
 */
export const config = (
  specificConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>,
  turbosnapRootDir?: string,
): StorybookConfig => ({
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    'storybook-dark-mode',
  ],
  // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories.
  typescript: {
    reactDocgen: false,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: true,
    },
  },
  viteFinal: async (config, { configType }) => {
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
        resolve: {
          alias: {
            // Some packages depend on automerge-repo. We alias them to point to our pre-bundled version.
            // `resolve` assumes that CWD is at the repo root.
            '@automerge/automerge-repo': resolve('packages/core/echo/automerge/dist/lib/browser/automerge-repo.js'),
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
            contentPaths: [resolve(__dirname, '../../../packages/**/src/**/*.{ts,tsx}')],
          }),
          ThemePlugin({
            root: __dirname,
            content: [
              resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}',
              resolve(__dirname, '../../../packages/plugins/*/src') + '/**/*.{ts,tsx,js,jsx}',
              resolve(__dirname, '../../../packages/plugins/experimental/*/src') + '/**/*.{ts,tsx,js,jsx}',
            ],
          }),
          TopLevelAwaitPlugin(),
          TurbosnapPlugin({ rootDir: turbosnapRootDir ?? config.root ?? __dirname }),
          WasmPlugin(),
        ],
      } satisfies InlineConfig,
    );
  },
  ...specificConfig,
});
