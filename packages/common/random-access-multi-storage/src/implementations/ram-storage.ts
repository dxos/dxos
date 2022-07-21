//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import ram from 'random-access-memory';

import { File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

/**
 * Storage interface implementation for RAM.
 */
export class RamStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  protected _createFile (filename: string, path: string): File {
    const fullPath = join(path, filename);
    const existingFile = this._getFileIfExists(fullPath);
    if (existingFile) {
      existingFile._reopen();
      return existingFile!;
    }
    const file = new File(ram());
    this._addFile(fullPath, file);
    return file;
  }

  protected override async _destroy () { }
}
