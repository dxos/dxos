//
// Copyright 2021 DXOS.org
//

import { MemoryStorage, type Storage, type StorageConstructor, StorageType } from '../common';

import { IDbStorage } from './idb-storage';
import { WebFS } from './web-fs';

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  if (type === undefined) {
    return new IDbStorage(root);
  }

  switch (type) {
    case StorageType.RAM: {
      return new MemoryStorage(root);
    }

    case StorageType.IDB:
    case StorageType.CHROME:
    case StorageType.FIREFOX: {
      return new IDbStorage(root);
    }

    case StorageType.WEBFS: {
      return new WebFS(root);
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
