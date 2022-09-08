//
// Copyright 2021 DXOS.org
//

import { NodeStorage } from './implementations/node-storage';
import { RamStorage } from './implementations/ram-storage';
import { Storage } from './interfaces/Storage';
import { StorageType } from './interfaces/storage-types';

// TODO(dmaretskyi): Root isn't required for RAM.
export const createStorage = (
  root: string,
  type?: StorageType
): Storage => {
  // TODO(dmaretskyi): Switch statement.
  if (type === undefined) {
    return new NodeStorage(root);
  }
  if (type === StorageType.RAM) {
    return new RamStorage(root);
  }
  if (type === StorageType.NODE) {
    return new NodeStorage(root);
  }

  throw new Error(`Unsupported storage: ${type}`);
};
