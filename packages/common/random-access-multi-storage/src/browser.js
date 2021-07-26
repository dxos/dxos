//
// Copyright 2021 DXOS.org
//

import { createStorageFactory } from './storage-factory';
import { STORAGE_RAM, STORAGE_IDB, STORAGE_CHROME, STORAGE_FIREFOX } from './storage-types';
import { Chrome } from './type/chrome';
import { Firefox } from './type/firefox';
import { IDB } from './type/idb';
import { Memory } from './type/memory';

// Extensions to manage and inspect storage.
// https://addons.mozilla.org/en-US/firefox/addon/clear-browsing-data/?src=search
// https://chrome.google.com/webstore/detail/clear-cache-for-chrome/lcebokhepdpopanpieoopnjiehmoabfp?hl=en-US

const storageTypes = {
  [STORAGE_RAM]: Memory,
  [STORAGE_IDB]: IDB,
  [STORAGE_CHROME]: Chrome,
  [STORAGE_FIREFOX]: Firefox
};

export * from './storage-types';
export const createStorage = createStorageFactory(storageTypes);
