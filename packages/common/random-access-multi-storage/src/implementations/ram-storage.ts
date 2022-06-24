//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';

import { File } from '../interfaces';
import { StorageType } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

export class RamStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;

  constructor (protected rootPath: string) {
    super(rootPath);
  }

  subDir (path: string) {
    return new RamStorage(`${this.rootPath}${path}`);
  }

  override createOrOpen (filename: string): File {
    const existingFile = this._getFileIfOpened(filename);
    if (existingFile) {
      return existingFile;
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

  protected override async _destroy () {
    await Promise.all(Array.from(this._files.values()).map(file => file.destroy()));
  }
}
