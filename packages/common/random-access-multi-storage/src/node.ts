//
// Copyright 2021 DXOS.org
//

import { NodeStorage } from './implementations/file-storage';
import { RamStorage } from './implementations/ram-storage';
import { STORAGE_RAM, STORAGE_NODE, StorageType } from './implementations/storage-types';
import { IStorage } from './interfaces/IStorage';

export const createStorage = (
  root: string,
  type?: StorageType
): IStorage => {
  if (type === undefined) {
    return new NodeStorage(root);
  }
  if (type === STORAGE_RAM) {
    return new RamStorage(root);
  }
  if (type === STORAGE_NODE) {
    return new NodeStorage(root);
  }
  throw new Error(`Unsupported storage: ${type}`);
}
