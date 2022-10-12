const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { dxosPlugin } = require('@dxos/vite-plugin');
const { themePlugin } = require('../dist/src/plugin.js');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-vite'
  },
  features: {
    storyStoreV7: true,
    previewMdx2: true
  },
  viteFinal: async (config) => mergeConfig(config, {
    optimizeDeps: {
      include: ['@dxos/react-ui', resolve(__dirname, '../dist')]
    },
    build: {
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    plugins: [dxosPlugin(), themePlugin({
      content: [resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}']
    })],
  })
};
