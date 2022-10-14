//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';
import type { Hypercore, HypercoreOptions } from 'hypercore';
import type { RandomAccessStorageConstructor } from 'random-access-storage';

// import { sha256 } from '@dxos/crypto';

import { wrapFeed, HypercoreFeed } from './hypercore-feed';

/**
 * Hypercore wrapper factory.
 */
export class HypercoreFactory {
  constructor (
    private readonly _storage: RandomAccessStorageConstructor
  ) {
    assert(this._storage);
  }

  /**
   * Creates a pify wrapped hypercore object.
   */
  create (publicKey?: Buffer, options?: HypercoreOptions): HypercoreFeed {
    // TODO(burdon): Make this pluggable.
    // const key = publicKey ? Buffer.from(sha256(publicKey.toString('hex'))) : undefined;
    const feed: Hypercore = hypercore(this._storage, publicKey, options);
    return wrapFeed(feed);
  }
}
