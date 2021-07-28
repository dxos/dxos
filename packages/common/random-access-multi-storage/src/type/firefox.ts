//
// Copyright 2021 DXOS.org
//

import randomAccessMutable from 'random-access-web/mutable-file-wrapper';

import { IDB } from './idb';

/**
 * IndexedDB for Firefox.
 */
export class Firefox extends IDB {
  protected override _createFileStorage () {
    return randomAccessMutable({ name: this._root });
  }
}
