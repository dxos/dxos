//
// Copyright 2022 DXOS.org
//

import { CID, create } from 'ipfs-http-client';
import { useMemo } from 'react';
import urlJoin from 'url-join';

/**
 * Return URL to IPFS resource on local gateway.
 * @param gateway
 * @param cid
 * @param filename
 */
export const getIpfsUrl = (gateway: string, cid: CID, filename?: string) => {
  const args = filename ? [`filename=${encodeURI(filename)}`] : [];
  return urlJoin(gateway, String(cid), '?', args.join('&'));
};

/**
 * https://www.npmjs.com/package/ipfs-http-client
 * https://www.npmjs.com/package/ipfs-http-client#example
 * https://docs.ipfs.tech/reference/kubo/cli
 * https://github.com/ipfs/ipfs-desktop/releases
 * http://127.0.0.1:5001/webui
 * NOTE: We need to run our own servers to enable CORS.
 * Ports
 * - 8001 Gateway
 * - 5001 API
 */
export const useIpfsClient = (url?: string) =>
  useMemo(() => {
    if (!url) {
      return undefined;
    }

    return create({ url });
  }, [url]);
