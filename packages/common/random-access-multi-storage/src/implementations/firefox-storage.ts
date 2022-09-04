//
// Copyright 2021 DXOS.org
//

import randomAccessMutable from 'random-access-web/mutable-file-wrapper';

import { IDbStorage } from './idb-storage';

/**
 * Storage interface implementation for Firefox browser
 */
export class FirefoxStorage extends IDbStorage {
  protected override _createFileStorage () {
    return randomAccessMutable({ name: this._path });
  }
}
