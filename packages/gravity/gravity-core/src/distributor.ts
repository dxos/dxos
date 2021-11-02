//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { buildBot, publishBot } from '@dxos/botkit-deprecated';

const log = debug('dxos:testing:distributor');

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
