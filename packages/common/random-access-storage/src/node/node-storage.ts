//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';
import { RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage, StorageType } from '../common';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  protected override _createFile (path: string, filename: string, opts: any = {}): RandomAccessStorage {
    return raf(filename, { directory: path, ...opts });
  }

  protected override async _destroy () {
    await del(this.path);
  }
}
