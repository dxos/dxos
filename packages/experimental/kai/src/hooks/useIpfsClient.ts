//
// Copyright 2023 DXOS.org
//

import { create } from 'ipfs-http-client';

import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';

/**
 * IPFS
 * To install IPFS locally: `brew install ipfs`
 * To edit/inspect the config: `ipfs config edit`
 * To run: `ipfs daemon`
 * ISSUE: 2023-01-28 IPFS Desktop failed to run on my OSX Silicon.
 * http://127.0.0.1:5001/webui
 * http://localhost:5001/api/v0
 *
 * Ports:
 * - 5001 API
 * - 8001 Gateway
 *
 * CORS: We need to run our own servers to enable CORS.
 * Set:
 * ```
 * HTTPHeaders:
 *  Access-Control-Allow-Methods: ["GET", "POST", "PUT"]
 *  Access-Control-Allow-Origin: ["*']
 * ```
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * - https://github.com/ipfs/js-ipfs/blob/master/docs/CORS.md
 *
 * Resources:
 * - https://docs.ipfs.tech/reference/kubo/cli
 * - https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 * - https://www.npmjs.com/package/ipfs-http-client
 */
// TODO(burdon): Remove dxos/react-ipfs.
export const useIpfsClient = () => {
  const config = useConfig();
  const ipfsClient = create({
    url: config.values.runtime?.services?.ipfs?.server, // TODO(burdon): Assert.
    timeout: 5_000
  });

  log('ipfs client', { config: ipfsClient.getEndpointConfig() });
  return ipfsClient;
};
