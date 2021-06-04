//
// Copyright 2020 DXOS.org
//

const path = require('path');

module.exports = {
  stories: [
    '../stories/**/*.jsx',
    '../stories/**/*.tsx'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links'
  ],
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
    return config;
  },
};
