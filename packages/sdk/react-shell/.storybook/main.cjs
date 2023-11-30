const { resolve } = require('path');
const { mergeConfig } = require('vite');
const turbosnap = require('vite-plugin-turbosnap');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');
const ReactPlugin = require('@vitejs/plugin-react');

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
      strictMode: false
    },
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
      build: {
        // NOTE: Browsers which support top-level await.
        target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15']
      },
      plugins: [
        // https://github.com/preactjs/signals/issues/269
        ReactPlugin({ jsxRuntime: 'classic' }),
        ConfigPlugin(),
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}',
          ],
        }),
        turbosnap({ rootDir: config.root }),
      ],
    });
  },
};
