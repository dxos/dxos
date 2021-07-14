//
// Copyright 2020 DXOS.org
//

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
  exclude: [/node_modules/],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'tsx'
          }
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
