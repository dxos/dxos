//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { IStorage } from '../interfaces/IStorage';
import { AbstractStorage } from './abstract-storage';
import { NodeStorage } from './file-storage';
import { FirefoxStorage } from './firefox-storage';
import { IDbStorage } from './idb-storage';

const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
const isBrowser = typeof window !== 'undefined';

export const defaultImplementation = (root: string): AbstractStorage => {
  if (isNode) {
    return new NodeStorage(root);
  }

  if (isBrowser) {
    // Phasing out Chrome FileSystem API at this time.
    // if ((window as any).requestFileSystem || (window as any).webkitRequestFileSystem) {
    //   return STORAGE_CHROME;
    // }

    if ((window as any).IDBMutableFile) {
      return new FirefoxStorage(root);
    }

    return new IDbStorage(root);
  }

  throw new Error('Unknown platform.');
};
