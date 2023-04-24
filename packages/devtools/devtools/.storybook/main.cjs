//
// Copyright 2023 DXOS.org
//

const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ThemePlugin } = require('@dxos/aurora-theme/plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [
        ThemePlugin({
          content: [
            resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}',
            resolve(__dirname, '../node_modules/@dxos/aurora/dist/**/*.mjs'),
resolve(__dirname, '../node_modules/@dxos/aurora-theme/dist/**/*.mjs'),
          ]
        })
      ]
    })
};
