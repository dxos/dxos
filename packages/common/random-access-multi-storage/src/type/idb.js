//
// Copyright 2021 DXOS.org
//

import randomAccessIdb from 'random-access-idb';

import { RandomAccessAbstract } from '../random-access-abstract';

/**
 * IndexedDB implementation.
 * To inspect storage: Dev tools > Application > IndexedDB.
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
export class IDB extends RandomAccessAbstract {
  constructor (root) {
    super(root);

    this._fileStorage = null;
  }

  _create (filename, opts = {}) {
    if (this._files.size === 0) {
      this._fileStorage = this._createFileStorage();
    }

    const file = this._fileStorage(filename, opts);

    // Monkeypatch close function.
    const defaultClose = file.close.bind(file);
    file.close = (cb) => {
      this._files.delete(file);
      if (this._files.size === 0) {
        return defaultClose(cb);
      }

      return cb();
    };

    return file;
  }

  async _destroy () {
    // eslint-disable-next-line no-undef
    return indexedDB.deleteDatabase(this._root);
  }

  _createFileStorage () {
    return randomAccessIdb(this._root);
  }
}
