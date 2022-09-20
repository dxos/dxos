//
// Copyright 2022 DXOS.org
//

const webpack = require('webpack');

const { ConfigPlugin } = require('@dxos/config/webpack-plugin');

module.exports = (context, options) => ({
  name: 'dxos-docusaurus-plugin',
  configureWebpack: (config, isServer) => ({
    plugins: [
      new ConfigPlugin(),
      /**
           * The package sodium-javascript, used on our packages, has a critical dependency issue.
           * This issue is throwing a warning on the build output, and causing the CI to fail.
           * The plugin below allows us to match the package during compilation and "acknowledge" the warning by ourselves.
           * We are "acknowledging" every "critical" warning.
           */
      new webpack.ContextReplacementPlugin(/\/node_modules\//, (data) => {
        data.dependencies.forEach(dependency => delete dependency.critical);
        return data;
      })
    ],
    resolve: {
      fallback: {
        fs: false
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          oneOf: [
            {
              resourceQuery: /@dxos\/showcase/,
              use: require.resolve('@dxos/showcase/loader')
            }
          ]
        },
        {
          test: /\.ts$/,
          oneOf: [
            {
              resourceQuery: /@dxos\/showcase/,
              use: require.resolve('@dxos/showcase/loader')
            }
          ]
        },
        {
          test: /\.tsx$/,
          oneOf: [
            {
              resourceQuery: /@dxos\/showcase/,
              use: require.resolve('@dxos/showcase/loader')
            }
          ]
        }
      ]
    },
    node: {
      __dirname: true
    },
    externals: isServer ? { // Only allow externals dependency when running in server. Otherwise it throws an error.
      fatfs: 'fatfs',
      runtimejs: 'runtimejs',
      wrtc: 'wrtc'
    } : {
      // TODO(wittjosiah): We should be inferring this from package.json browser fields.
      //   https://github.com/webpack/webpack/issues/14798
      'node:assert': 'commonjs assert',
      'node:path': 'commonjs path-browserify',
      'node:util': 'commonjs util'
    }
  })
});
