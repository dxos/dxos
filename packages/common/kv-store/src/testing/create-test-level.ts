//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { type LevelDB, createLevel } from '../level';

export const createTestLevel = (path = `/tmp/dxos-${PublicKey.random().toHex()}`): LevelDB => createLevel(path);
