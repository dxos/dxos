//
// Copyright 2021 DXOS.org
//

import { FirefoxStorage } from './implementations/firefox-storage';
import { IDbStorage } from './implementations/idb-storage';
import { RamStorage } from './implementations/ram-storage';
import { STORAGE_RAM, STORAGE_IDB, STORAGE_CHROME, STORAGE_FIREFOX } from './implementations/storage-types';
import { IStorage } from './interfaces/IStorage';

// Extensions to manage and inspect storage.
// https://addons.mozilla.org/en-US/firefox/addon/clear-browsing-data/?src=search
// https://chrome.google.com/webstore/detail/clear-cache-for-chrome/lcebokhepdpopanpieoopnjiehmoabfp?hl=en-US

export const createStorage = (
  root: string,
  type?: typeof STORAGE_RAM | typeof STORAGE_IDB | typeof STORAGE_CHROME | typeof STORAGE_FIREFOX
) => {
  if (type === undefined) {
    return defaultBrowserImplementation(root)
  }
  if (type === STORAGE_RAM) {
    return new RamStorage(root);
  }
  if (type === STORAGE_IDB || type === STORAGE_CHROME) {
    return new IDbStorage(root);
  }
  if (type === STORAGE_FIREFOX) {
    return new FirefoxStorage(root);
  }
  throw new Error(`Unsupported storage: ${type}`);
}



const defaultBrowserImplementation = (root: string): IStorage => {
  if ((window as any).IDBMutableFile) {
    return new FirefoxStorage(root);
  }

  return new IDbStorage(root);
};
