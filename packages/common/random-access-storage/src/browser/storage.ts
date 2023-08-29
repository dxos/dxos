//
// Copyright 2021 DXOS.org
//

import { MemoryStorage, Storage, StorageConstructor, StorageType } from '../common';
import { FirefoxStorage } from './firefox-storage';
import { IDbStorage } from './idb-storage';
import { WebFS } from './web-fs';
import { WebFSBlocking } from './web-fs-blocking';

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  if (type === undefined) {
    if (
      navigator &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function' &&
      FileSystemFileHandle &&
      typeof (FileSystemFileHandle.prototype as any).createWritable === 'function'
    ) {
      return new WebFS(root);
    } else {
      return new IDbStorage(root);
    }
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

    case StorageType.WEBFS: {
      return new WebFS(root);
    }

    case StorageType.WEBFS_BLOCKING: {
      return new WebFSBlocking(root);
    }

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
