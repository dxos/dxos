const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ThemePlugin } = require('@dxos/react-components/plugin');

module.exports = {
  stories: ['../../stories/html/**/*.stories.mdx', '../../stories/html/**/*.stories.@(js|jsx|ts|tsx)'],
  // addons: [
  //   '@storybook/addon-links',
  //   '@storybook/addon-essentials',
  //   '@storybook/addon-interactions'
  // ],
  framework: {
    name: '@storybook/html-vite',
    options: {}
  },
  // viteFinal: async (config) =>
  //   mergeConfig(config, {
  //     plugins: [
  //       ThemePlugin({
  //         content: [
  //           resolve(__dirname, '../../src') + '/**/*.{ts,tsx,js,jsx}',
  //           resolve(__dirname, '../../node_modules/@dxos/react-components/dist/**/*.mjs')
  //         ]
  //       })
  //     ]
  //   })
};
