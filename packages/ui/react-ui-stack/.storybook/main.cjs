const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');
const turbosnap = require('vite-plugin-turbosnap');

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
  viteFinal: async (config) => mergeConfig(config, {
    build: {
      // NOTE: Browsers which support top-level await.
      target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15']
    },
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
