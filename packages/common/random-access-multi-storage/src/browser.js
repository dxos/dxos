//
// Copyright 2020 DxOS.
//

import { createStorageFactory } from './storage-factory';
import { STORAGE_RAM, STORAGE_IDB, STORAGE_CHROME, STORAGE_FIREFOX } from './storage-types';

import { Memory } from './type/memory';
import { IDB } from './type/idb';
import { Chrome } from './type/chrome';
import { Firefox } from './type/firefox';

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
