//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { PublicKey } from '@dxos/keys';

import { type MyLevel } from '../automerge/types';

export const createTestLevel = async (): Promise<MyLevel> => {
  const level = new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
  await level.open();
  return level;
};
