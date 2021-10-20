//
// Copyright 2020 DXOS.org
//

const path = require('path');
const webpack = require('webpack');
const toPath = (filePath) => path.join(process.cwd(), filePath);

module.exports = {
  stories: [
    '../stories/**/*.(jsx|tsx)',

    '../../tutorials/apps/tasks-app/stories/**/*.(jsx|tsx)',

    // TODO(burdon): Enable local storybook testing also.
    '../../react-client/stories/**/*.(jsx|tsx)',
    '../../react-components/stories/**/*.(jsx|tsx)',
    '../../react-framework/stories/**/*.(jsx|tsx)',
    '../../react-registry-client/stories/**/*.(jsx|tsx)'
  ],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links'
  ],

  exclude: [/node_modules/],

  // TODO(burdon): Factor out into toolchain.
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader')
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

    // https://mui.com/guides/migration-v4/
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          '@emotion/core': toPath('node_modules/@emotion/react'),
          'emotion-theming': toPath('node_modules/@emotion/react')
        }
      }
    };
    // return config;
  }
};
