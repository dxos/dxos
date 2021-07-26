//
// Copyright 2020 DxOS.
//

import del from 'del';
import raf from 'random-access-file';

import { RandomAccessAbstract } from '../random-access-abstract';

/**
 * Node specific file storage.
 */
export class File extends RandomAccessAbstract {
  _create (filename, opts = {}) {
    return raf(filename, {
      directory: this._root,
      ...opts
    });
  }

  _destroy () {
    return del(this._root);
  }
}
