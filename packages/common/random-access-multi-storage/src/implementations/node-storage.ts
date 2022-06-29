//
// Copyright 2021 DXOS.org
//

import del from 'del';

import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';
import { NodeDirectory } from './node-directory';

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  _createDirectory (path: string) {
    return new NodeDirectory(getFullPath(this._path, path), this);
  }

  async _destroy () {
    await del(this._path);
  }
}
