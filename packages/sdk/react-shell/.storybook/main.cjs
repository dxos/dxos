const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/aurora-theme/plugin');

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
  framework: {
    name: '@storybook/react-vite',
    options: {
      strictMode: true
    }
  },
  viteFinal: async (config) => {
    // https://github.com/storybookjs/builder-vite/issues/286
    config.plugins = [
      ...config.plugins.filter((plugin) => {
        return !(
          Array.isArray(plugin) && plugin[0].name === "vite:react-babel"
        );
      }),
    ];
    return mergeConfig(config, {
      plugins: [
        ConfigPlugin(),
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}',
          ]
        })
      ]
    })
  }
};
