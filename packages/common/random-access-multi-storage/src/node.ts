//
// Copyright 2021 DXOS.org
//

import { createStorageFactory } from './storage-factory';
import { STORAGE_NODE, STORAGE_RAM } from './storage-types';
import { File } from './type/file';
import { Memory } from './type/memory';

const storageTypes = {
  [STORAGE_RAM]: Memory,
  [STORAGE_NODE]: File
};

export const createStorage = createStorageFactory(storageTypes);
