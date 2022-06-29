//
// Copyright 2021 DXOS.org
//

import { Directory } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';
import { RamDirectory } from './ram-directory';

export class RamStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  directory (path = ''): Directory {
    return new RamDirectory(getFullPath(this._path, path), this);
  }

  protected override async _destroy () {}
}
