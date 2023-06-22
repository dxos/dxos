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
          root: __dirname,
          content: [
            resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
            resolve(__dirname, '../node_modules/@braneframe/plugin-markdown/node_modules/@dxos/aurora-composer/src/**/*.{js,ts,jsx,tsx}')
          ]
        })
      ]
    })
};
