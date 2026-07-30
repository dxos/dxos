//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { createLevel } from '../create-level';
import { type LevelDB } from '../level';

export const createTestLevel = (path = `/tmp/dxos-${PublicKey.random().toHex()}`): LevelDB => createLevel(path);
