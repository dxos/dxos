//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import ram from 'random-access-memory';

import { Directory, File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { getFullPath } from '../utils';
import { AbstractStorage } from './abstract-storage';

export class RamStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  directory (path = ''): Directory {
    return new Directory(getFullPath(this._path, path), (filename:string, path:string) => {
      const fullPath = join(path, filename);
      const existingFile = this._getFileIfExists(fullPath);
      if (existingFile) {
        existingFile._reopen();
        return existingFile!;
      }
      const file = new File(ram());
      this._addFile(fullPath, file);
      return file;
    });
  }

  protected override async _destroy () {}
}
