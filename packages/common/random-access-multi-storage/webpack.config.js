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
      // js/mjs
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader'
        }
      },

      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto'
      }
    ]
  }
};
