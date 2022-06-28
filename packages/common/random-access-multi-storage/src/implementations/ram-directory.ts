//
// Copyright 2022 DXOS.org
//

import ram from 'random-access-memory';

import { File } from '../interfaces';
import { AbstractDirectory } from './abstract-directory';

export class RamDirectory extends AbstractDirectory {
  override createOrOpen (filename: string): File {
    const existingFile = this._getFileIfOpened(filename);
    if (existingFile) {
      return existingFile!;
    }
    const file = this._create();
    this._files.set(filename, file);
    return file;
  }

  protected _getFileIfOpened (filename: string) {
    if (this._files.has(filename)) {
      const file = this._files.get(filename);
      if (file && !file._isDestroyed()) {
        file._reopen();
        return file;
      }
    }
    return null;
  }

  protected override _create (): File {
    return new File(ram());
  }
}
