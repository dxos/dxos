//
// Copyright 2021 DXOS.org
//

import idb from 'random-access-idb';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { BrowserStorage } from './browser-storage';
import { StorageType, wrapFile } from '../common';

const win = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : undefined;

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
