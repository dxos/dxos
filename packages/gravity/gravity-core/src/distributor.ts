//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import fetch from 'node-fetch';
import tar from 'tar';

import { buildBot } from '@dxos/botkit';

const log = debug('dxos:testing:distributor');

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

export { buildBot };
