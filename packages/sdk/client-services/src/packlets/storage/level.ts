//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';
import path from 'node:path';

import { PublicKey } from '@dxos/keys';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { getRootPath, isPersistent } from './util';

export const createLevel = async (config: Runtime.Client.Storage) => {
  const persistent = isPersistent(config);
  const storagePath = persistent ? getRootPath(config) : path.join('tmp', 'level', PublicKey.random().toHex());
  const level = new Level<string, string>(storagePath);
  await level.open();
  return level;
};
