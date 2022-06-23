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
    const existingFile = Array.from(this._files.values()).filter(file => file.name === filename).filter(file => !file.isDestroyed())[0];
    if (existingFile) {
      existingFile.reopen();
      return existingFile;
    } else {
      const file = this._create(filename);
      this._files.add(file);
      return file;
    }
  }

  protected override _create (filename: string): File {
    return new File(ram(), filename);
  }

  protected override async _destroy () {
    await Promise.all(Array.from(this._files.values()).map(file => file.destroy()));
  }
}
