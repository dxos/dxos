//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';

import { RandomAccessFile } from '../types';
import { AbstractStorage } from './abstract-storage';
import { StorageType } from './storage';

/**
 * Storage interface implementation for RAM.
 * https://github.com/random-access-storage/random-access-memory
 */
export class MemoryStorage extends AbstractStorage {
  public override type: StorageType = StorageType.RAM;
  private _ram?: RandomAccessFile; 

  protected override _createFile (path: string, filename: string): RandomAccessFile {
    if (!this._ram || this._ram?.destroyed) {
      this._ram = ram()
    } else {
      this._ram = this._ram.clone!()
      // Hack to reopen RAM storage.
      this._ram.closed = false;
    }
    return this._ram!;
  }
}
