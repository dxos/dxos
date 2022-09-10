//
// Copyright 2021 DXOS.org
//

import { Storage, StorageConstructor, StorageType } from './api';
import { NodeStorage } from './implementations/node-storage';
import { RamStorage } from './implementations/ram-storage';

export const createStorage: StorageConstructor = (root: string, type?: StorageType): Storage => {
  if (type === undefined) {
    return new NodeStorage(root);
  }

  switch (type) {
    case StorageType.RAM: {
      return new RamStorage(root);
    }
    case StorageType.NODE: {
      return new NodeStorage(root);
    }
    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
