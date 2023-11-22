const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { default: pluginWasm } = require('vite-plugin-wasm');
const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: true,
    },
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      plugins: [
        pluginWasm(),
        ConfigPlugin(),
        ThemePlugin({
          root: __dirname,
          content: [resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}'],
        }),
      ],
    }),
};
