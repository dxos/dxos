//
// Copyright 2024 DXOS.org
//

import { type StorybookConfig } from '@storybook/web-components-vite';
import { resolve } from 'node:path';
import { join } from 'path';
import { mergeConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

export const packages = resolve(__dirname, '../../../packages');
const phosphorIconsCore = resolve(__dirname, '../../../node_modules/@phosphor-icons/core/assets');

const contentFiles = '*.{ts,tsx,js,jsx}';

const isTrue = (str?: string) => str === 'true' || str === '1';

export const config = (baseConfig: Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>): StorybookConfig => ({
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-themes',
  ],
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
            resolve(packages, '*/*/src/**', contentFiles),
            resolve(packages, 'experimental/*/src/**', contentFiles),
            resolve(packages, 'plugins/*/src/**', contentFiles),
            resolve(packages, 'plugins/experimental/*/src/**', contentFiles),
          ],
        }),
        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
          spriteFile: resolve(__dirname, '../static/icons.svg'),
          contentPaths: [join(packages, '/**/src/**/*.{ts,tsx}')],
        }),
        // https://github.com/antfu-collective/vite-plugin-inspect#readme
        // Open: http://localhost:5173/__inspect
        isTrue(process.env.DX_INSPECT) && Inspect(),
      ],
    });
  },
  ...baseConfig,
});
