//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';
import { RandomAccessStorage } from 'random-access-storage';

import { AbstractStorage } from './abstract-storage';
import { StorageType } from './storage';
import { getFullPath } from './utils';

/**
 * Storage interface implementation for RAM.
 * https://github.com/random-access-storage/random-access-memory
 */
export class MemoryStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;
  private _ramFiles = new Map<string, RandomAccessStorage>; 

  protected override _createFile (path: string, filename: string): RandomAccessStorage {
    const fullPath = getFullPath(path, filename);
    let ramFile = this._ramFiles.get(fullPath);

    if (!ramFile|| ramFile?.destroyed) {
      ramFile = ram();
    } else {
      ramFile = ramFile.clone!()
      // Hack to reopen RAM storage.
      ramFile.closed = false;
    }

    this._ramFiles.set(fullPath, ramFile!)
    return ramFile!;
  }
}
