//
// Copyright 2020 DXOS.org
//

// https://storybook.js.org/docs/configurations/custom-webpack-config

const path = require('path');

module.exports = {
  typescript: {
    reactDocgen: 'none',
  },
  stories: ['../stories/*.stories.{js,jsx,ts,tsx}'],
  addons: ['@storybook/addon-actions', '@storybook/addon-knobs'],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
        },
        // // Optional
        // {
        //   loader: require.resolve('react-docgen-typescript-loader'),
        // },
      ],
    });
    config.resolve.extensions.push('.ts', '.tsx');
    return config;
  },
};
