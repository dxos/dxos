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
    '@storybook/addon-links',
    {
      name: 'storybook-addon-turbo-build',
      options: {
        loader: 'tsx',
        esbuildMinifyOptions: {
          target: 'es2018'
        }
      }
    }
  ],
  exclude: [/node_modules/],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
        },
        // Optional
        {
          loader: require.resolve('react-docgen-typescript-loader'),
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
