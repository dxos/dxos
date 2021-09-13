//
// Copyright 2021 DXOS.org
//

import pify from 'pify';
import ram from 'random-access-memory';

import { StorageType, STORAGE_RAM } from '../interfaces/storage-types';
import { AbstractStorage } from './abstract-storage';

export class RamStorage extends AbstractStorage {
  public override type: StorageType = STORAGE_RAM;

  constructor (protected rootPath: string) {
    super(rootPath);
  }

  subDir (path: string) {
    return new RamStorage(`${this.rootPath}${path}`);
  }

  protected override _create () {
    return ram();
  }

  protected override async _destroy () {
    await Promise.all(Array.from(this._files.values()).map(file => pify(file.destroy.bind(file))()));
  }
}
