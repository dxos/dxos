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

// TODO(burdon): Set auto title (remove need for actual title property).
//  https://storybook.js.org/docs/configure/sidebar-and-urls#csf-30-auto-titles

export const config = (
  specificConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>,
  turbosnapRootDir?: string,
): StorybookConfig => ({
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-themes',
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
        resolve: {
          alias: {
            // Some packages depend on automerge-repo. We alias them to point to our pre-bundled version.
            // `resolve` assumes that CWD is at the repo root.
            '@automerge/automerge-repo': resolve('packages/core/echo/automerge/dist/lib/browser/automerge-repo.js'),
          },
        },
        // TODO(burdon): Disable overlay error (e.g., "ESM integration proposal for Wasm" is not supported currently.")
        server: {
          hmr: {
            overlay: false,
          },
        },
        worker: {
          format: 'es',
          plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
        },
        plugins: [
          ThemePlugin({
            root: __dirname,
            content: [
              resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}',
              resolve(__dirname, '../../../packages/apps/plugins/*/src') + '/**/*.{ts,tsx,js,jsx}',
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
