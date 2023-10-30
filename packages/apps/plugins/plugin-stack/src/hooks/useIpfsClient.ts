//
// Copyright 2023 DXOS.org
//

import { create, type IPFSHTTPClient } from 'ipfs-http-client';
import { useMemo } from 'react';

import { useConfig } from '@dxos/react-client';

export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

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
// TODO(burdon): Factor out and remove Remove dxos/react-ipfs package.
export const useIpfsClient = ({ timeout = 30_000 }: { timeout?: number } = {}): IPFSHTTPClient | undefined => {
  const config = useConfig();
  const ipfsClient = useMemo(() => {
    const server = config.values.runtime?.services?.ipfs?.server;
    if (server) {
      return create({ url: server, timeout });
    }
  }, []);

  return ipfsClient;
};
