//
// Copyright 2022 DXOS.org
//

import jsondown from 'jsondown';
import { join } from 'path';

import { ECHO } from '@dxos/echo-db';
import { createStorage, StorageType } from '@dxos/random-access-storage';

export const createPersistentInstance = (storagePath: string) =>
  new ECHO({
    storage: createStorage({ type: StorageType.NODE, root: storagePath }),
    keyStorage: jsondown(join(storagePath, 'keys.json'))
  });
