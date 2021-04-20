//
// Copyright 2020 DXOS.org
//

const path = require('path');

module.exports = {
  stories: ['../stories/**/*.{jsx,js,tsx}'],
  addons: ['@storybook/addon-actions', '@storybook/addon-knobs'],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('awesome-typescript-loader'),
        },
        // Optional
        {
          loader: require.resolve('react-docgen-typescript-loader'),
        },
      ],
    });
    config.resolve.extensions.push('.ts', '.tsx');
    return config;
  },
};
