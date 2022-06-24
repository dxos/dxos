//
// Copyright 2022 DXOS.org
//

import jsondown from 'jsondown';
import { join } from 'path';

import { ECHO } from '@dxos/echo-db';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

export function createPersistentInstance (storagePath: string) {
  return new ECHO({
    storage: createStorage(storagePath, StorageType.NODE),
    keyStorage: jsondown(join(storagePath, 'keys.json'))
  });
}
