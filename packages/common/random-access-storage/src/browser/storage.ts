//
// Copyright 2021 DXOS.org
//

import { MemoryStorage, Storage, StorageConstructor, StorageType } from '../common';
import { FirefoxStorage } from './firefox-storage';
import { IDbStorage } from './idb-storage';
import { WebFS } from './web-fs';

let INSIDE_WEBKIT: boolean;
try {
  if (mochaExecutor.environment === 'webkit') {
    INSIDE_WEBKIT = true;
  }
} catch (e) {
  INSIDE_WEBKIT = false;
}

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  if (type === undefined) {
    if (typeof navigator.storage.getDirectory === 'function' && !INSIDE_WEBKIT) {
      // WEBFS is not supported in webkit test environment but it passes check for navigator.storage.getDirectory.
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

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
