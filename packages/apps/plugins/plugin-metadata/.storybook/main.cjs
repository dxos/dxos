const { resolve } = require('path');
const { mergeConfig } = require('vite');
const turbosnap = require('vite-plugin-turbosnap');
const ReactPlugin = require('@vitejs/plugin-react');

const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');

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
        ThemePlugin({
          root: __dirname,
          content: [
            resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
            resolve(__dirname, '../node_modules/@dxos/react-client/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-ui/dist/**/*.mjs'),
            resolve(__dirname, '../node_modules/@dxos/react-ui-theme/dist/**/*.mjs'),
          ],
        }),
        turbosnap({ rootDir: config.root }),
      ],
    });
  },
};
