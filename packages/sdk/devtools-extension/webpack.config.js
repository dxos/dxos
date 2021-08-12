//
// Copyright 2020 DXOS.org
//

/* eslint-disable quote-props */

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebPackPlugin = require('copy-webpack-plugin');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
  devtool: 'eval-source-map',

  entry: {
    'background': `${__dirname}/src/background/index.js`,
    'content-script': `${__dirname}/src/content-script/index.js`,
    'devtools': `${__dirname}/src/devtools/index.js`,
    'devtools-client-api': `${__dirname}/src/devtools-client-api/index.js`,
    'main-panel': `${__dirname}/src/main-panel/index.ts`,
    'popup': `${__dirname}/src/popup/index.js`
  },

  output: {
    path: `${__dirname}/dist`,
    filename: '[name].js'
  },

  plugins: [
    // https://webpack.js.org/plugins/html-webpack-plugin/
    new HtmlWebPackPlugin({
      title: 'Devtools',
      chunks: ['devtools'],
      filename: 'devtools.html',
      template: 'src/devtools/template.html'
    }),
    new HtmlWebPackPlugin({
      title: 'DXOS',
      chunks: ['main-panel'],
      filename: 'main-panel.html',
      template: 'src/main-panel/template.html'
    }),
    new HtmlWebPackPlugin({
      title: 'DXOS',
      chunks: ['popup'],
      filename: 'popup.html',
      template: 'src/popup/template.html'
    }),

    new CopyWebPackPlugin({
      patterns: [
        'assets/**',
        'src/manifest.json'
      ]
    }),

    // To strip all locales except “en”.
    new MomentLocalesPlugin()
  ],

  node: {
    fs: 'empty'
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  module: {
    rules: [
      // js
      {
        test: /\.[jt]sx?$/,
        include: path.resolve(__dirname, './src'),
        exclude: /node_modules/,
        loader: 'ts-loader'
      },

      // config
      {
        test: /\.ya?ml$/,
        type: 'json',
        use: ['yaml-loader']
      },

      // fonts
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/'
            }
          }
        ]
      }
    ]
  }
};
