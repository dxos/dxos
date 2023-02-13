const { mergeConfig } = require('vite');
const { resolve } = require('node:path');

const { ThemePlugin } = require('../dist/plugin/node/plugin.cjs');

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
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) => mergeConfig(config, {
    plugins: [ThemePlugin({
      content: [resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}']
    })],
  })
};
