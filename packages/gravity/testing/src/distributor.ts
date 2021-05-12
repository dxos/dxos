//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar';
import webpack from 'webpack';

import { createId } from '@dxos/crypto';

const BUILD_PATH = './out/builds/';

const log = debug('dxos:testing:distributor');

const getWebpackConfig = (botPath: string, buildPath: string, browser = false): webpack.Configuration => {
  return {
    target: browser ? undefined : 'node',

    mode: 'development',

    stats: 'errors-only',

    entry: path.resolve(botPath),

    output: {
      path: path.resolve(buildPath),
      filename: '[name].js',
      libraryTarget: browser ? undefined : 'commonjs2',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    },

    node: browser
      ? {
        fs: 'empty'
      }
      : undefined,

    externals: browser
      ? {
        'read-pkg-up': 'read-pkg-up'
      }
      : {
        fatfs: 'fatfs',
        runtimejs: 'runtimejs',
        wrtc: 'wrtc',
        bip32: 'bip32',
        typeforce: 'typeforce'
      },

    resolve: {
      modules: ['node_modules']
    },

    plugins: [
      // new webpack.IgnorePlugin(/(?!\.\/native-container)\.\/native/),
      new webpack.IgnorePlugin(/^electron$/)
    ],

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: './dist/babel-cache/',
              // TODO(egorgripasov): Webpack does not see babel conf.
              ...JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.babelrc'), 'utf8'))
            }
          }
        },
        {
          test: /simple-websocket\/.*\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: './dist/babel-cache/',
              // TODO(egorgripasov): Webpack does not see babel conf.
              ...JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.babelrc'), 'utf8'))
            }
          }
        }
      ]
    }
  };
};

export const buildBot = async (botPath: string, browser: boolean) => {
  const buildPath = path.join(BUILD_PATH, createId());

  const webpackConf = getWebpackConfig(botPath, buildPath, browser);

  await new Promise((resolve, reject) => {
    webpack({ ...webpackConf, stats: 'errors-only' }, (err, stats) => {
      if (err /* || stats.hasErrors() */) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });

  return buildPath;
};

const publishBot = async (ipfsEndpoint: string, buildPath: string) => {
  if (!ipfsEndpoint.endsWith('/')) {
    ipfsEndpoint = `${ipfsEndpoint}/`;
  }

  const response = await fetch(ipfsEndpoint, {
    method: 'POST',
    body: tar.c({ gzip: true, C: buildPath }, ['.'])
  });

  return response.headers.get('Ipfs-Hash');
};

/**
 * @param {string} ipfsEndpoint IPFS Gateway endpoint.
 * @param {string} botPath Path to bot file from cwd.
 */
export const buildAndPublishBot = async (ipfsEndpoint: string, botPath: string, browser: boolean) => {
  log(`Building package, browser=${browser}`);
  const buildPath = await buildBot(botPath, browser);
  log(`Publishing to IPFS node: ${ipfsEndpoint} from ${buildPath}`);
  const ipfsCID = await publishBot(ipfsEndpoint, buildPath);
  log(`Published: ${ipfsCID}`);
  return ipfsCID;
};
