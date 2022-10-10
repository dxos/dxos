//
// Copyright 2021 DXOS.org
//

import { MemoryStorage, Storage, StorageConstructor, StorageType } from '../common/index.js';
import { NodeStorage } from './node-storage.js';

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  if (type === undefined) {
    return new NodeStorage(root);
  }

  switch (type) {
    case StorageType.RAM: {
      return new MemoryStorage(root);
    }

    case StorageType.NODE: {
      return new NodeStorage(root);
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
