//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { getRootPath } from './util';

export const createLevel = async (config: Runtime.Client.Storage) => {
  const level = new Level<string, string>(getRootPath(config) + PublicKey.random().toString());
  log.info('Opening level', { path: getRootPath(config) });
  await level.open();
  return level;
};
