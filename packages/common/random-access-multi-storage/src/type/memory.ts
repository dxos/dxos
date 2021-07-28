//
// Copyright 2021 DXOS.org
//

import pify from 'pify';
import ram from 'random-access-memory';

import { RandomAccessAbstract } from '../random-access-abstract';

/**
 * In-memory storage for caching and testing.
 */
export class Memory extends RandomAccessAbstract {
  protected override _create () {
    return ram();
  }

  protected override async _destroy () {
    return Promise.all(Array.from(this._files.values()).map(file => pify(file.destroy.bind(file))()));
  }
}
