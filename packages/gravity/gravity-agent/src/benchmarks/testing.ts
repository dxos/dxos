//
// Copyright 2023 DXOS.org
//

import { Agent } from '../agent';
import { loadConfig } from '../utils';

export const testPeerFactory = (): Agent => {
  const config = loadConfig('./config.yml');
  return new Agent({ config });
};
