//
// Copyright 2021 DXOS.org
//

import del from 'del';

import { Directory } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';
import { NodeDirectory } from './node-directory';

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  directory (path = ''): Directory {
    return new NodeDirectory(getFullPath(this._path, path), this);
  }

  async _destroy () {
    await del(this._path);
  }
}
