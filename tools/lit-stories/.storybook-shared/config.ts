//
// Copyright 2024 DXOS.org
//

import { type StorybookConfig } from '@storybook/web-components-vite';
import { resolve } from 'node:path';
import { mergeConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

export const config = (
  specificConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>,
): StorybookConfig => ({
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: [resolve(__dirname, '../static')],
  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}',
            resolve(__dirname, '../../../packages/experimental/*/src') + '/**/*.{ts,tsx,js,jsx}',
            resolve(__dirname, '../../../packages/plugins/*/src') + '/**/*.{ts,tsx,js,jsx}',
            resolve(__dirname, '../../../packages/plugins/experimental/*/src') + '/**/*.{ts,tsx,js,jsx}',
          ],
        }),
        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `./packages/icons/node_modules/@phosphor-icons/core/assets/${variant}/${name}${
              variant === 'regular' ? '' : `-${variant}`
            }.svg`,
          spritePath: resolve(__dirname, '../dist/assets/sprite.svg'),
          contentPaths: ['**/*.stories.{ts,tsx}'],
        }),
      ],
    });
  },
  ...specificConfig,
});
