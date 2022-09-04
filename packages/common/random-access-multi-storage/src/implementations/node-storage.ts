//
// Copyright 2021 DXOS.org
//

import del from 'del';
import { join } from 'node:path';
import raf from 'random-access-file';

import { File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  protected _createFile (filename: string, path: string, opts: any = {}): File {
    const file = new File(raf(filename, { directory: path, ...opts }));
    this._addFile(join(path, filename), file);
    return file;
  }

  async _destroy () {
    await del(this._path);
  }
}
