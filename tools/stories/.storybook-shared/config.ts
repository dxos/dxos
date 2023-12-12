//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import ReactPlugin from '@vitejs/plugin-react';
import flatten from 'lodash.flatten';
import { resolve } from 'path';
import { mergeConfig } from 'vite';
import turbosnap from 'vite-plugin-turbosnap';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

export const config = (
  specificConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>,
): StorybookConfig => ({
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories
  typescript: { reactDocgen: false },
  framework: {
    name: '@storybook/react-vite',
    options: {},
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
        plugins: [
          ThemePlugin({
            root: __dirname,
            content: [resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}'],
          }),
          turbosnap({ rootDir: config.root ?? __dirname }),
        ],
      },
    );
  },
  ...specificConfig,
});
