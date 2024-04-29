//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { PublicKey } from '@dxos/keys';

import { type LevelDB } from '../automerge/types';

export const createTestLevel = (path = `/tmp/dxos-${PublicKey.random().toHex()}`): LevelDB =>
  new Level<string, string>(path);
