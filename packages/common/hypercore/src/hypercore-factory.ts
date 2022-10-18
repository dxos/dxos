//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';
import type { Hypercore, HypercoreOptions } from 'hypercore';
import type { RandomAccessStorageConstructor } from 'random-access-storage';

/**
 * Creates feeds with default properties.
 */
export class HypercoreFactory {
  constructor (
    private readonly _storage: RandomAccessStorageConstructor,
    private readonly _options?: HypercoreOptions
  ) {
    assert(this._storage);
  }

  createFeed (publicKey?: Buffer, options?: HypercoreOptions): Hypercore {
    return hypercore(this._storage, publicKey, Object.assign({}, this._options, options));
  }
}
