//
// Copyright 2023 DXOS.org
//

const { resolve } = require('path');
const { mergeConfig } = require('vite');

const turbosnap = require('vite-plugin-turbosnap');

const { ThemePlugin } = require('packages/ui/react-ui-theme/plugin');
const ReactPlugin = require("@vitejs/plugin-react");

module.exports = {
  stories: [
    '../../../packages/*/*/src/**/*.stories.{mdx,tsx}'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { useSWC: true } }
  },
  viteFinal: async (config) => {
    return mergeConfig(config, {
    plugins: [
      ThemePlugin({
        root: __dirname,
        content: [
          resolve(__dirname, '../../../packages/*/*/src') + '/**/*.{ts,tsx,js,jsx}',
        ]
      }),
      turbosnap({ rootDir: config.root }),
    ],
  })}
};
