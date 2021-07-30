//
// Copyright 2021 DXOS.org
//

import randomAccessMutable from 'random-access-web/mutable-file-wrapper';

import { IDbStorage } from './idb-storage';

export class FirefoxStorage extends IDbStorage {
  protected override _createFileStorage () {
    return randomAccessMutable({ name: this._root });
  }
}
