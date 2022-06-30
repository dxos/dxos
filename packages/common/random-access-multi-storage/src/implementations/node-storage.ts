//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';

import { Directory, File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  directory (path = ''): Directory {
    return new Directory(getFullPath(this._path, path), (filename:string, path:string, opts: any = {}) =>
      new File(raf(filename, {
        directory: path,
        ...opts
      }))
    );
  }

  async _destroy () {
    await del(this._path);
  }
}
