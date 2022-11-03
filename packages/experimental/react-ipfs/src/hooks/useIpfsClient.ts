//
// Copyright 2022 DXOS.org
//

import { CID, create } from 'ipfs-http-client';
import path from 'path';
import { useMemo } from 'react';

/**
 * Return URL to IPFS resource on local gateway.
 * @param gateway
 * @param cid
 * @param filename
 */
export const getIpfsUrl = (gateway: string, cid: CID, filename?: string) => {
  const args = filename ? [`filename=${encodeURI(filename)}`] : [];
  return path.join(gateway, String(cid), '?', args.join('&'));
};

/**
 * https://www.npmjs.com/package/ipfs-http-client#example
 * NOTE: We need to run our own servers to enable CORS.
 * Ports
 * - 8001 Gateway
 * - 5001 API
 */
// TODO(kaplanski): Factor out IPFS related functionality to its own package.
export const useIpfsClient = (url?: string) =>
  useMemo(() => {
    if (!url) {
      return undefined;
    }

    return create({ url });
  }, [url]);
