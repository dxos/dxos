//
// Copyright 2024 DXOS.org
// This file has been automatically migrated to valid ESM format by Storybook.
//

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type StorybookConfig } from '@storybook/web-components-vite';
import { type InlineConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isTrue = (str?: string) => str === 'true' || str === '1';

const baseDir = resolve(__dirname, '../');
const rootDir = resolve(baseDir, '../../');
const staticDir = resolve(baseDir, './static');
const iconsDir = resolve(rootDir, 'node_modules/@phosphor-icons/core/assets');

export const packages = resolve(rootDir, 'packages');
export const storyFiles = '*.lit-stories.ts';
export const contentFiles = '*.{ts,tsx,js,jsx,css}';
export const modules = ['ui/*/src/**'];

export const stories = modules.map((dir) => join(packages, dir, storyFiles));
export const content = modules.map((dir) => join(packages, dir, contentFiles));

export const config = ({ stories: baseStories, ...baseConfig }: Partial<StorybookConfig> = {}): StorybookConfig => ({
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  stories: baseStories ?? stories,
  addons: ['@storybook/addon-docs', '@storybook/addon-links', '@storybook/addon-themes'],
  staticDirs: [staticDir],
  ...baseConfig,
  /**
   * https://storybook.js.org/docs/api/main-config/main-config-vite-final
   */
  viteFinal: async (config: InlineConfig) => {
    // NOTE: Dynamic imports seems to help avoid conflicts with storybook's internal esbuild-register usage & Vite 7.
    const { mergeConfig } = await import('vite');
    const { default: Inspect } = await import('vite-plugin-inspect');

    return mergeConfig(config, {
      plugins: [
        isTrue(process.env.DX_INSPECT) && Inspect(),

        IconsPlugin({
          symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
          assetPath: (name, variant) =>
            `${iconsDir}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
          spriteFile: resolve(__dirname, '../static/icons.svg'),
          contentPaths: [join(packages, '/**/src/**/*.{ts,tsx}')],
        }),

        ThemePlugin({
          root: __dirname,
          content: [
            resolve(packages, 'apps/*/src/**', contentFiles),
            resolve(packages, 'devtools/*/src/**', contentFiles),
            resolve(packages, 'experimental/*/src/**', contentFiles),
            resolve(packages, 'plugins/*/src/**', contentFiles),
            resolve(packages, 'sdk/*/src/**', contentFiles),
            resolve(packages, 'ui/*/src/**', contentFiles),
          ],
        }),
      ],
    });
  },
});

export default config();
