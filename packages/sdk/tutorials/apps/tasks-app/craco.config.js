const webpack = require('webpack');
const path = require('path');
const { ConfigPlugin } = require('@dxos/config/ConfigPlugin');
const BabelRcPlugin = require('@jackwilsdon/craco-use-babelrc');

module.exports = {
  plugins: [
    {
      plugin: BabelRcPlugin
    }
  ],
  webpack: {
    plugins: {
      add: [
        new ConfigPlugin({
          path: path.resolve(__dirname, 'config'),
          dynamic: process.env.CONFIG_DYNAMIC
        }),
        /**
         * The package sodium-javascript, used on our packages, has a critical dependency issue.
         * This issue is throwing a warning on the build output, and causing the CI to fail.
         * The plugin below allows us to match the package during compilation and "acknowledge" the warning by ourselves.
         * We are "acknowledging" every "critical" warning.
         */
        new webpack.ContextReplacementPlugin(/\/common\/temp\/node_modules\/.pnpm\//, (data) => {
          data.dependencies.forEach(dependency => delete dependency.critical)
          return data;
        }),

        new webpack.ProvidePlugin({
          Buffer: [require.resolve('buffer/'), 'Buffer']
        })
      ],
    },
    config: {
      node: {
        Buffer: false
      }
    }
  },
};
