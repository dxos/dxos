//
// Copyright 2022 DXOS.org
//

import jsondown from 'jsondown';
import { join } from 'path';

import { ECHO } from '@dxos/echo-db';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

export function createPersistentInstance (storagePath: string) {
  return new ECHO({
    feedStorage: createStorage(join(storagePath, 'feeds'), StorageType.NODE),
    metadataStorage: createStorage(join(storagePath, 'metadata'), StorageType.NODE),
    snapshotStorage: createStorage(join(storagePath, 'metadata'), StorageType.NODE),
    keyStorage: jsondown(join(storagePath, 'keys.json'))
  });
}
