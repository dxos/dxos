//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { PublicKey } from '@dxos/keys';

import { type LevelDb } from '../automerge/types';

export const createTestLevel = (): LevelDb => new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
