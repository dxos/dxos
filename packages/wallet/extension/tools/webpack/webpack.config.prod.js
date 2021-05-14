module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/main.tsx',
    background: './src/background/background.ts'
  },
  module: {
    rules: require('./webpack.rules'),
  },
  output: {
    filename: '[name].js',
    // chunkFilename: '[name].[chunkhash].chunk.js'
  },
  plugins: [...require('./webpack.plugins')],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  stats: 'errors-warnings',
  devtool: 'eval-source-map',
  optimization: {
    minimize: false,
    sideEffects: true,
    concatenateModules: false,
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 10,
      minSize: 0,
      cacheGroups: {
        vendor: {
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
        },
      },
    },
  },
};
