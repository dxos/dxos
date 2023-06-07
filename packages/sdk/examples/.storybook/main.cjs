
const { resolve } = require('path');
const { mergeConfig } = require('vite');
const turbosnap = require('vite-plugin-turbosnap');

const { ThemePlugin } = require('@dxos/aurora-theme/plugin');

module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: false
    },
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      build: {
        // NOTE: Browsers which support top-level await.
        target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15']
      },
      plugins: [
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
            resolve(__dirname, '../node_modules/@dxos/react-client/dist/**/*.mjs'),
          ],
        }),
        turbosnap({ rootDir: config.root }),
      ],
    }),
};
