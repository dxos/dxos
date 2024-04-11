//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { type MyLevel } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';

export const createTestLevel = async (): Promise<MyLevel> => {
  const level = new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
  await level.open();
  return level;
};
