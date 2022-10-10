//
// Copyright 2021 DXOS.org
//

import randomAccessIdb from 'random-access-idb';

import { StorageType } from '../common/index.js';
import { RandomAccessStorage } from './random-access-storage.js';

/**
 * Storage interface implementation for index DB.
 */
export class IDbStorage extends RandomAccessStorage {
  public override type: StorageType = StorageType.IDB;

  protected _createFileStorage (path: string) {
    return randomAccessIdb(path);
  }
}
