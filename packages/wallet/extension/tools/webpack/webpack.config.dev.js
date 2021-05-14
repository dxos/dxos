module.exports = {
  mode: 'development',
  entry: {
    popup: './src/popup/main.tsx',
    background: './src/background/background.ts'
  },
  module: {
    rules: require('./webpack.rules'),
  },
  output: {
    filename: '[name].js',
    // chunkFilename: '[name].chunk.js',
  },
  plugins: require('./webpack.plugins'),
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    alias: {
      // React Hot Loader Patch
      'react-dom': '@hot-loader/react-dom',
    },
  },
  stats: 'errors-warnings',
  devtool: 'eval-source-map',
  devServer: {
    open: true,
    stats: 'errors-warnings',
    hot: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  performance: {
    hints: false,
  },
};
