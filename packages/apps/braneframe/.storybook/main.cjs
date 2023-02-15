//
// Copyright 2023 DXOS.org
//

const { mergeConfig } = require('vite');

const { default: viteConfig } = require('../vite.config');

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
        viteConfig.plugins.find(plugin => plugin.name === 'dxos-config'),
        viteConfig.plugins.find(plugin => plugin.name === 'vite-plugin-dxos-ui-theme')
      ]
    })
};
