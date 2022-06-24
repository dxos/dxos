//
// Copyright 2021 DXOS.org
//

import { File } from '../interfaces/File';
import { Storage } from '../interfaces/Storage';
import { StorageType } from '../interfaces/storage-types';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements Storage {
  protected readonly _root: string;
  protected _files: Map<string, File>;
  public abstract type: StorageType

  constructor (root: string) {
    this._root = root;
    this._files = new Map<string, File>();
  }

  public createOrOpen (filename: string, opts = {}): File {
    const file = this._create(filename, opts);
    this._files.set(filename, file);
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

  public abstract subDir (path: string): Storage
  protected abstract _create (filename: string, opts?: any): File;
  protected abstract _destroy (): Promise<void>;
}
