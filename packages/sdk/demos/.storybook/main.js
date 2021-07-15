//
// Copyright 2020 DXOS.org
//

const path = require('path');
const webpack = require('webpack');

module.exports = {
  stories: [
    '../stories/**/*.(jsx|tsx)',
    '../../tutorials/apps/tasks-app/stories/**/*.(jsx|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links'
  ],
  core: {
      builder: 'storybook-builder-vite',
  },
  exclude: [/node_modules/],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
        }
      ],
    });
    config.resolve.extensions.push('.ts', '.tsx');
    config.node = {
      Buffer: false
    };
    config.plugins.push(new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer']
    }));
    return config;
  },
};
