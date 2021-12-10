//
// Copyright 2021 DXOS.org
//

import { join } from 'path';

import { createId } from '@dxos/crypto';

import { BotHandle } from '../bot-handle';

export const BOTS_PATH = join(__dirname, '../../bots');

export const createHandle = () => {
  const id = createId();
  return new BotHandle(id, join(BOTS_PATH, id));
};
