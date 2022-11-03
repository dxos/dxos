//
// Copyright 2022 DXOS.org
//

import { CID, IPFSHTTPClient } from 'ipfs-http-client';
import { useMemo } from 'react';

import { Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

export type IPFSFile = {
  filename?: string;
  cid: CID;
  size?: number;
};

/**
 * Returns a list of mapped IPFS files.
 * @param party
 * @param type
 */
export const useIpfsFiles = (party: Party | undefined, type: string) => {
  // TODO(burdon): Schema definitions for types?
  // TODO(burdon): Use reducer to do mapping?
  const items = useSelection(party?.select().filter({ type }));

  const files: IPFSFile[] =
    useMemo(
      () =>
        items?.map((item) => ({
          filename: item.model.getProperty('filename'),
          cid: item.model.getProperty('cid'),
          size: item.model.getProperty('size')
        })),
      [items]
    ) ?? [];

  return files;
};

// TODO(wittjosiah): This is not returning IPFSFiles.
export const uploadFilesToIpfs = async (ipfsClient: IPFSHTTPClient, files: File[], onError?: (error: Error) => void) =>
  await Promise.all(
    files.map(async (file) => {
      // https://docs.ipfs.io/reference/js/api
      // https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client
      try {
        const { cid, path, size } = await ipfsClient.add(file);
        await ipfsClient.pin.add(cid);
        // TODO(kaplanski): path is CID v0. cid is CID v1. Current default is v0, but will be updated to v1 in the future. We'll need to update to support v1.
        return {
          cid: path,
          size,
          filename: file.name
        };
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(err as string)); // TODO(burdon): Generalize.
      }
    })
  );
