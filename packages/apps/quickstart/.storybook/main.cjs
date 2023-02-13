const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/react-components/plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-dark-mode'
  ],
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-vite'
  },
  features: {
    storyStoreV7: true,
    previewMdx2: true
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [
        ConfigPlugin(),
        ThemePlugin({
          content: [
            resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
            resolve(__dirname, '../node_modules/@dxos/react-components/dist/**/*.js'),
            resolve(__dirname, '../node_modules/@dxos/react-appkit/dist/**/*.js')
          ]
        })
      ]
    })
};