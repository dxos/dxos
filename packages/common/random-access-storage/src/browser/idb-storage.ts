//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';

import { BrowserStorage } from './browser-storage';
import { StorageType } from '../common';

/**
 * Storage interface implementation for index DB.
 * https://github.com/random-access-storage/random-access-idb
 */
export class IDbStorage extends BrowserStorage {
  public override type: StorageType = StorageType.IDB;

  protected override _createFileStorage(path: string) {
    return idb(path);
  }
}
