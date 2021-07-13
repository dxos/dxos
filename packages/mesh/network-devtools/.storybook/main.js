//
// Copyright 2020 DXOS.org
//

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  stories: ['../stories/**/*.{tsx,jsx}'],
  addons: ['@storybook/addon-knobs'],
  exclude: [/node_modules/],
  webpackFinal: async config => {
    // The version shipped with storybook is outdated so we are using our own.
    config.plugins.push(new ForkTsCheckerWebpackPlugin({
      typescript: {
        typescriptPath: require.resolve('typescript')
      }
    }))
    return config;
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};
