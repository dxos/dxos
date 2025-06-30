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

const contentFiles = '*.{ts,tsx,js,jsx,css}';

const isTrue = (str?: string) => str === 'true' || str === '1';

type ConfigProps = Partial<StorybookConfig> & Pick<StorybookConfig, 'stories'>;

export const config = (baseConfig: ConfigProps): StorybookConfig => ({
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  docs: {
    // TODO(burdon): Invalid prop.
    // autodocs: 'tag',
  },
  staticDirs: [resolve(__dirname, '../static')],

  ...baseConfig,

  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [
        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
          spriteFile: resolve(__dirname, '../static/icons.svg'),
          contentPaths: [join(packages, '/**/src/**/*.{ts,tsx}')],
        }),
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(packages, 'apps/*/src/**', contentFiles),
            resolve(packages, 'experimental/*/src/**', contentFiles),
            resolve(packages, 'plugins/*/src/**', contentFiles),
            resolve(packages, 'sdk/*/src/**', contentFiles),
            resolve(packages, 'ui/*/src/**', contentFiles),
          ],
        }),
        // https://github.com/antfu-collective/vite-plugin-inspect#readme
        // Open: http://localhost:5173/__inspect
        isTrue(process.env.DX_INSPECT) && Inspect(),
      ],
    });
  },
});
