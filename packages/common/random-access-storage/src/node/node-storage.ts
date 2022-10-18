//
// Copyright 2021 DXOS.org
//

import del from 'del';
import raf from 'random-access-file';
import { RandomAccessStorage } from 'random-access-storage';
import { File, FileWrap } from '../common/file'

import { AbstractStorage, StorageType } from '../common';

/**
 * Storage interface implementation for Node.
 */
export class NodeStorage extends AbstractStorage {
  public override type: StorageType = StorageType.NODE;

  protected override _createFile (
    path: string,
    filename: string,
    opts: any = {}
  ): File {
    const native: RandomAccessStorage = raf(filename, { directory: path, ...opts });

    // Empty write to create file on a drive.
    native.write(0, Buffer.from(''));

    return new FileWrap(native);
  }

  protected override async _destroy () {
    await del(this.path);
  }
}
