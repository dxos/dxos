//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { type LevelDB } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';

export const createTestLevel = (path = `/tmp/dxos-${PublicKey.random().toHex()}`): LevelDB =>
  new Level<string, string>(path);
