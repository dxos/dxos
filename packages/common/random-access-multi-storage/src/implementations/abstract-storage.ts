//
// Copyright 2021 DXOS.org
//

import pify from 'pify';

import { IFile } from '../interfaces/IFile';
import { IStorage } from '../interfaces/IStorage';
import { StorageType } from './storage-types';

/**
 * Base class for all storage implementations.
 */
export abstract class AbstractStorage implements IStorage {
  protected readonly _root: string;
  protected readonly _files: Set<IFile>;
  public abstract type: StorageType

  constructor (root: string) {
    this._root = root;
    this._files = new Set();
  }

  public createOrOpen (filename: string, opts = {}) {
    const file = this._create(filename, opts);
    this._files.add(file);
    return file as any;
  }

  public async delete (filename: string) {
    throw new Error('not implemented');
  }

  private _close () {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => pify(file.close.bind(file))().catch((err: any) => console.error(err.message)))
    );
  }

  async destroy () {
    try {
      await this._close();
      await this._destroy();
      this._files.clear();
    } catch (err) {
      console.error(err.message);
    }
  }

  public abstract subDir (path: string): IStorage
  protected abstract _create (filename: string, opts?: any): IFile;
  protected abstract _destroy (): Promise<void>;
}
