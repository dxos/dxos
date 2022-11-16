const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { themePlugin } = require('../dist/src/plugin.js');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-dark-mode',
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
      force: true,
      include: [
        'storybook-dark-mode'
      ]
    },
    build: {
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    plugins: [themePlugin({
      content: [resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}']
    })],
  })
};
