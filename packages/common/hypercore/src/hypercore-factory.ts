//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';

import { sha256 } from '@dxos/crypto';
import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

import { wrapFeed, HypercoreFeed } from './hypercore-feed';
import type { Hypercore, FeedOptions } from './types';

/**
 * Hypercore wrapper factory.
 */
export class HypercoreFactory {
  constructor (
    private readonly _storage: RandomAccessFileConstructor
  ) {
    assert(this._storage);
  }

  /**
   * Creates a pify wrapped hypercore object.
   */
  create (publicKey?: Buffer, options?: FeedOptions): HypercoreFeed {
    // TODO(burdon): Make this pluggable.
    const key = publicKey ? Buffer.from(sha256(publicKey.toString('hex'))) : undefined;
    const feed: Hypercore = hypercore(this._storage, publicKey, options);
    return wrapFeed(feed);
  }
}
