//
// Copyright 2023 DXOS.org
//

const { resolve } = require('path');
const { mergeConfig } = require('vite');

const turbosnap = require('vite-plugin-turbosnap');

const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  staticDirs: [ './public' ],
  viteFinal: async (config) => mergeConfig(config, {
    plugins: [
      ThemePlugin({
        root: __dirname,
        content: [
          resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}',
        ]
      }),
      turbosnap({ rootDir: config.root }),
    ],
  })
};
