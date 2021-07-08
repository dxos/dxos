//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar';
import { build } from 'esbuild';
import { NodeGlobalsPolyfillPlugin, FixMemdownPlugin, FixGracefulFsPlugin, NodeModulesPlugin } from '@dxos/esbuild-plugins';

import { createId } from '@dxos/crypto';

const BUILD_PATH = './out/builds/';

const log = debug('dxos:testing:distributor');

export const buildBot = async (botPath: string, browser: boolean) => {
  const buildPath = path.join(BUILD_PATH, createId());

  await build({
    entryPoints: [botPath],
    write: true,
    bundle: true,
    platform: browser ? 'browser' : 'node',
    format: 'cjs',
    sourcemap: 'inline',
    outfile: buildPath,
    external: browser
      ? ['read-pkg-up']
      : [
        'fatfs',
        'runtimejs',
        'wrtc',
        'bip32',
        'typeforce',
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
