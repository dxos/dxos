//
// Copyright 2021 DXOS.org
//

import { detect } from 'detect-browser';

import { MemoryStorage, Storage, StorageConstructor, StorageType } from '../common';
import { FirefoxStorage } from './firefox-storage';
import { IDbStorage } from './idb-storage';
import { WebFS } from './web-fs';

export const createStorage: StorageConstructor = ({ type, root = '' } = {}): Storage => {
  const browser = detect();

  if (type === undefined) {
    if (
      navigator &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function' &&
      browser &&
      (browser?.name === 'chrome' || browser?.name === 'chromium-webview' || browser?.name === 'edge-chromium')
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

    default: {
      throw new Error(`Invalid type: ${type}`);
    }
  }
};
