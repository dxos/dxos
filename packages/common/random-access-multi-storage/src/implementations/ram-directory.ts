//
// Copyright 2022 DXOS.org
//

import { join } from 'path';
import ram from 'random-access-memory';

import { File } from '../interfaces';
import { AbstractDirectory } from './abstract-directory';

export class RamDirectory extends AbstractDirectory {
  override createOrOpen (filename: string): File {
    const fullPath = join(this._path, filename);
    const existingFile = this._storage._getFileIfExists(fullPath);
    if (existingFile) {
      existingFile._reopen();
      return existingFile!;
    }
    const file = this._create();
    this._storage._addFile(fullPath, file);
    return file;
  }

  protected override _create (): File {
    return new File(ram());
  }
}
