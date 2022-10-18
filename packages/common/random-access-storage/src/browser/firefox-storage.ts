//
// Copyright 2021 DXOS.org
//

import raw from 'random-access-web/mutable-file-wrapper';

import { StorageType } from '../common';
import { IDbStorage } from './idb-storage';

/**
 * Storage interface implementation for Firefox browser.
 * https://github.com/random-access-storage/random-access-web
 */
export class FirefoxStorage extends IDbStorage {
  public override type: StorageType = StorageType.FIREFOX;

  protected override _createFileStorage (path: string) {
    return raw({ name: path });
  }
}
