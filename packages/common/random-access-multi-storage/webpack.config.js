//
// Copyright 2020 DxOS.
//

const path = require('path');

const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './browser.environment.js',

  devtool: 'eval-source-map',

  devServer: {
    contentBase: path.join(__dirname, '.temp'),
    compress: true,
    disableHostCheck: true,
    port: 8099,
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 600
    }
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  plugins: [
    new HtmlWebPackPlugin()
  ],

  node: {
    fs: 'empty'
  },

  output: {
    path: `${__dirname}/.temp`,
    filename: 'bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  }
};
