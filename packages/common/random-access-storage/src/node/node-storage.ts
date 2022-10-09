//
// Copyright 2021 DXOS.org
//

import del from 'del';
import { join } from 'node:path';
import raf from 'random-access-file';

import { createFile, AbstractStorage, File, StorageType } from '../common';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  protected _createFile (path: string, filename: string, opts: any = {}): File {
    const file = createFile(raf(filename, { directory: path, ...opts }));
    this._addFile(join(path, filename), file);
    return file;
  }

  async _destroy () {
    await del(this.path);
  }
}
