//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';

import { File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  constructor (protected rootPath: string) {
    super(rootPath);
  }

  subDir (path: string) {
    return new NodeStorage(`${this.rootPath}${path}`);
  }

  _create (filename: string, opts: any = {}): File {
    return new File(raf(filename, {
      directory: this._root,
      ...opts
    }));
  }

  async _destroy () {
    await del(this._root);
  }
}
