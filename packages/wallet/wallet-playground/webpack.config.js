//
// Copyright 2020 DXOS.org
//

const path = require('path');
const webpack = require('webpack');
const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const { ConfigPlugin } = require('@dxos/config/ConfigPlugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: './src/main.tsx',
  devtool: isDevelopment ? 'eval-source-map' : false,
  mode: isDevelopment ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    compress: true,
    disableHostCheck: true,
    hotOnly: true,
    port: 8080,
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 600
    }
  },

  node: {
    fs: 'empty',
    Buffer: false
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new ConfigPlugin({
      path: path.resolve(__dirname, 'config'),
      dynamic: process.env.CONFIG_DYNAMIC
    }),
    new webpack.EnvironmentPlugin({
      DEBUG: '',
    }),
    new HtmlWebPackPlugin({
       template: path.resolve( __dirname, 'public/index.html' ),
       filename: 'index.html'
    }),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer']
    }),
 ]
}
