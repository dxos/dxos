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

  protected override _create (): File {
    return new File(ram());
  }

  protected override async _destroy () {
    await Promise.all(Array.from(this._files.values()).map(file => file.destroy()));
  }
}
