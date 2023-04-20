//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { Agent } from '../agent';
import { loadConfig } from '../utils';

export const testPeerFactory = (): Agent => {
  const config = loadConfig(join(__dirname, 'config.yml'));
  return new Agent({ config });
};
