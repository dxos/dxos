//
// Copyright 2021 DXOS.org
//

import pify from 'pify';

import { File } from './types';

/**
 * Base class for all storage types.
 */
export abstract class RandomAccessAbstract {
  protected readonly _root: string;
  protected readonly _files: Set<File>;

  constructor (root: string) {
    this._root = root;
    this._files = new Set();
  }

  create (filename: string, opts = {}) {
    const file = this._create(filename, opts);
    this._files.add(file);
    return file;
  }

  async close () {
    return Promise.all(
      Array.from(this._files.values())
        .map(file => pify(file.close.bind(file))().catch(err => console.error(err.message)))
    );
  }

  async destroy () {
    try {
      await this.close();
      await this._destroy();
      this._files.clear();
    } catch (err) {
      console.error(err.message);
    }
  }

  protected abstract _create (filename: string, opts: any): File;
  protected abstract _destroy (): Promise<any>;
}
