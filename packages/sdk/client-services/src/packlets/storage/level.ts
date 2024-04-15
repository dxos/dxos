//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';
import path from 'node:path';

import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { getRootPath } from './util';

export const createLevel = async (config: Runtime.Client.Storage) => {
  const storagePath = path.join(getRootPath(config), 'level');
  const level = new Level<string, string>(storagePath);
  await level.open();
  return level;
};
