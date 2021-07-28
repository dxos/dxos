//
// Copyright 2021 DXOS.org
//

import { defaultImplementation } from './implementations/default-implementation';
import { NodeStorage } from './implementations/file-storage';
import { RamStorage } from './implementations/ram-storage';
import { STORAGE_RAM, STORAGE_NODE } from './implementations/storage-types';

export const createStorage = async (
  root: string,
  type: typeof STORAGE_RAM | typeof STORAGE_NODE
) => {
  if (type === undefined) {
    return defaultImplementation(root)
  }
  if (type === STORAGE_RAM) {
    return new RamStorage(root);
  }
  if (type === STORAGE_NODE) {
    return new NodeStorage(root);
  }
  throw new Error(`Unsupported storage: ${type}`);
}
