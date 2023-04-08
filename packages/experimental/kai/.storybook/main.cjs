//
// Copyright 2023 DXOS.org
//

const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ThemePlugin } = require('@dxos/react-components/plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-addon-react-router-v6'
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
            resolve(__dirname, '../node_modules/@dxos/chess-app/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/kai-frames/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/mosaic/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-appkit/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-components/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-composer/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-list/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-ui/dist/**/*.mjs')
          ]
        })
      ]
    })
};
