//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { build } from 'esbuild';
import fetch from 'node-fetch';
import { resolve } from 'path';
import tar from 'tar';

import { createId } from '@dxos/crypto';
import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

const BUILD_PATH = './out/builds/';

const log = debug('dxos:testing:distributor');

export const buildBot = async (botPath: string, browser: boolean) => {
  const buildPath = resolve(BUILD_PATH, `${createId()}.js`);

  await build({
    entryPoints: [botPath],
    write: true,
    bundle: true,
    platform: browser ? 'browser' : 'node',
    format: 'cjs',
    // sourcemap: 'inline',
    outfile: buildPath,
    external: browser
      ? ['read-pkg-up']
      : [
          'fatfs',
          'runtimejs',
          'wrtc',
          'bip32',
          'typeforce',
          'sodium-universal'
        ],
    plugins: browser
      ? [
          NodeModulesPlugin(),
          NodeGlobalsPolyfillPlugin(),
          FixMemdownPlugin(),
          FixGracefulFsPlugin()
        ]
      : []
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
