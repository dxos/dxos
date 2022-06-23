//
// Copyright 2021 DXOS.org
//

import { File } from '../interfaces/File';
import { IStorage } from '../interfaces/IStorage';
import { StorageType } from '../interfaces/storage-types';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements IStorage {
  protected readonly _root: string;
  protected readonly _files: Set<File>;
  public abstract type: StorageType

  constructor (root: string) {
    this._root = root;
    this._files = new Set();
  }

  public createOrOpen (filename: string, opts = {}): File {
    const file = this._create(filename, opts);
    this._files.add(file);
    return file;
  }

  public async delete (filename: string) {
    throw new Error('not implemented');
  }

  private _close () {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => file.close().catch((error: any) => console.error(error.message)))
    );
  }

  async destroy () {
    try {
      await this._close();
      await this._destroy();
      this._files.clear();
    } catch (error: any) {
      console.error(error);
    }
  }

  public abstract subDir (path: string): IStorage
  protected abstract _create (filename: string, opts?: any): File;
  protected abstract _destroy (): Promise<void>;
}
