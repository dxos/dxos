//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';
import { AbstractStorage } from "./abstract-storage";
import { StorageType, STORAGE_NODE } from "./storage-types";

export class NodeStorage extends AbstractStorage {
  public override type: StorageType = STORAGE_NODE;

  constructor (protected rootPath: string) {
    super(rootPath);
  }

  subDir(path: string) {
    return new NodeStorage(`${this.rootPath}${path}`)
  }

  _create (filename: string, opts: any = {}) {
    return raf(filename, {
      directory: this._root,
      ...opts
    });
  }

  async _destroy () {
    await del(this._root);
  }
}
