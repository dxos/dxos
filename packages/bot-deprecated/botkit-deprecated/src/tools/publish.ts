//
// Copyright 2021 DXOS.org
//

import fetch from 'node-fetch';
import tar from 'tar';

export const publishBot = async (ipfsEndpoint: string, buildPath: string) => {
  if (!ipfsEndpoint.endsWith('/')) {
    ipfsEndpoint = `${ipfsEndpoint}/`;
  }

  const response = await fetch(ipfsEndpoint, {
    method: 'POST',
    body: tar.c({ gzip: true, C: buildPath }, ['.'])
  });

  return response.headers.get('Ipfs-Hash');
};
