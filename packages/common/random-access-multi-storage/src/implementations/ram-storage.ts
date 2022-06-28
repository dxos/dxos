//
// Copyright 2021 DXOS.org
//

import { join } from 'path';

import { Directory } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';
import { RamDirectory } from './ram-directory';

export class RamStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  _createDirectory (relativePath: string): Directory {
    return new RamDirectory(join(this._path, relativePath), this);
  }

  protected override async _destroy () {}
}
