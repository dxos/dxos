//
// Copyright 2020 DxOS.
//

import { createStorageFactory } from './storage-factory';
import { STORAGE_NODE, STORAGE_RAM } from './storage-types';

import { Memory } from './type/memory';
import { File } from './type/file';

const storageTypes = {
  [STORAGE_RAM]: Memory,
  [STORAGE_NODE]: File
};

export * from './storage-types';
export const createStorage = createStorageFactory(storageTypes);
