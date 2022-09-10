//
// Copyright 2021 DXOS.org
//

import { StorageConstructor, StorageType } from './api';
import { FirefoxStorage } from './implementations/firefox-storage';
import { IDbStorage } from './implementations/idb-storage';
import { RamStorage } from './implementations/ram-storage';

export { StorageType };

// Developer tools: Browser extensions to manage and inspect storage.
// https://addons.mozilla.org/en-US/firefox/addon/clear-browsing-data/?src=search
// https://chrome.google.com/webstore/detail/clear-cache-for-chrome/lcebokhepdpopanpieoopnjiehmoabfp?hl=en-US

export const createStorage: StorageConstructor = (root: string, type?: StorageType) => {
  if (type === undefined) {
    return ((window as any).IDBMutableFile) ? new FirefoxStorage(root) : new IDbStorage(root);
  }

  switch (type) {
    case StorageType.RAM: {
      return new RamStorage(root);
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
