//
// Copyright 2024 DXOS.org
//

import urlJoin from 'url-join';

import { type Config } from '@dxos/react-client';

export const getIpfsUrl = (config: Config, cid: string) => {
  return urlJoin(config.values.runtime!.services!.ipfs!.gateway!, cid);
};
