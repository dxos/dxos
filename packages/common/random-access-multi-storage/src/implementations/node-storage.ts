//
// Copyright 2021 DXOS.org
//

import del from 'del';
import { join } from 'path';

import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';
import { NodeDirectory } from './node-directory';

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  _createDirectory (relativePath: string) {
    return new NodeDirectory(join(this._path, relativePath), this);
  }

  async _destroy () {
    await del(this._path);
  }
}
