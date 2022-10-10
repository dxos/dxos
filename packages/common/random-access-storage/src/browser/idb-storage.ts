//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';

import { StorageType } from '../common';
import { BrowserStorage } from './browser-storage';

/**
 * Storage interface implementation for index DB.
 */
export class IDbStorage extends BrowserStorage {
  public override type: StorageType = StorageType.IDB;

  protected override _createFileStorage (path: string) {
    return idb(path);
  }
}
