//
// Copyright 2024 DXOS.org
//

import { Level } from 'level';

import { PublicKey } from '@dxos/keys';

import { type MyLevel } from '../automerge/types';

export const createTestLevel = (): MyLevel => new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
