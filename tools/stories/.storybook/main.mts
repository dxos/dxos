//
// Copyright 2023 DXOS.org
//

import { type StorybookConfig } from '@storybook/react-vite';
import { resolve } from 'path';
import { mergeConfig } from 'vite';
import turbosnap from 'vite-plugin-turbosnap';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

const config: StorybookConfig = {
  stories: ['../../../packages/*/*/src/**/*.stories.{mdx,tsx}'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  // TODO(thure): react-docgen is failing on something in @dxos/hypercore, invoking a dialog in unrelated stories
  typescript: { reactDocgen: false },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [
        ThemePlugin({
          root: __dirname,
          content: [resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}'],
        }),
        turbosnap({ rootDir: config.root ?? __dirname }),
      ],
    });
  },
};

export default config;
