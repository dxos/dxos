//
// Copyright 2021 DXOS.org
//

import { MemoryStorage, Storage, StorageConstructor, StorageType } from '../common';
import { FirefoxStorage } from './firefox-storage';
import { IDbStorage } from './idb-storage';

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  if (type === undefined) {
    return ((window as any).IDBMutableFile) ? new FirefoxStorage(root) : new IDbStorage(root);
  }

  switch (type) {
    case StorageType.RAM: {
      return new MemoryStorage(root);
    }

    case StorageType.IDB:
    case StorageType.CHROME: {
      return new IDbStorage(root);
    }

    case StorageType.FIREFOX: {
      return new FirefoxStorage(root);
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
