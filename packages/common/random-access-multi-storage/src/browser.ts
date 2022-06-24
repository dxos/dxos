//
// Copyright 2021 DXOS.org
//

import { FirefoxStorage } from './implementations/firefox-storage';
import { IDbStorage } from './implementations/idb-storage';
import { RamStorage } from './implementations/ram-storage';
import { Storage } from './interfaces/Storage';
import { StorageType } from './interfaces/storage-types';

export { StorageType };
// Extensions to manage and inspect storage.
// https://addons.mozilla.org/en-US/firefox/addon/clear-browsing-data/?src=search
// https://chrome.google.com/webstore/detail/clear-cache-for-chrome/lcebokhepdpopanpieoopnjiehmoabfp?hl=en-US

export const createStorage = (
  root: string,
  type?: StorageType
) => {
  if (type === undefined) {
    return defaultBrowserImplementation(root);
  }
  if (type === StorageType.RAM) {
    return new RamStorage(root);
  }
  if (type === StorageType.IDB || type === StorageType.CHROME) {
    return new IDbStorage(root);
  }
  if (type === StorageType.FIREFOX) {
    return new FirefoxStorage(root);
  }
  throw new Error(`Unsupported storage: ${type}`);
};

const defaultBrowserImplementation = (root: string): Storage => {
  if ((window as any).IDBMutableFile) {
    return new FirefoxStorage(root);
  }

  return new IDbStorage(root);
};
