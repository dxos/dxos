//
// Copyright 2021 DXOS.org
//

import pify from 'pify';

/**
 * Base class for all storage types.
 */
export class RandomAccessAbstract {
  constructor (root) {
    this._root = root;
    this._files = new Set();
  }

  create (filename, opts = {}) {
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

  // eslint-disable-next-line class-methods-use-this
  _create () {
    throw new Error('Not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this
  async _destroy () {
    throw new Error('Not implemented.');
  }
}
