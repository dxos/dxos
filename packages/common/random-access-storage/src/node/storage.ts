//
// Copyright 2021 DXOS.org
//

import { NodeStorage } from './node-storage';
import { MemoryStorage, type Storage, type StorageConstructor, StorageType } from '../common';

export const createStorage: StorageConstructor = ({ type, root = '/tmp/dxos/testing' } = {}): Storage => {
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
