//
// Copyright 2024 DXOS.org
//

import { type AbstractSublevel } from 'abstract-level';
import { Level } from 'level';

import { PublicKey } from '@dxos/keys';

export type MyLevel = Level<string, string>;
export type MySublevel = AbstractSublevel<MyLevel, string | Buffer | Uint8Array, string, string>;

export const createTestLevel = async (): Promise<MyLevel> => {
  const level = new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
  await level.open();
  return level;
};
