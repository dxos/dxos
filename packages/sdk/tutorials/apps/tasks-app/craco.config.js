const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: {
      add: [
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
      ],
    },
  },
};
