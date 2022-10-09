//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore from 'hypercore';
import pify from 'pify';
import ram from 'random-access-memory';

import { sha256 } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import type { RandomAccessFileConstructor } from '@dxos/random-access-storage';

import { defaultFeedOptions } from './defaults';
import { HypercoreFeed } from './hypercore-feed';
import type { FeedOptions } from './types';

/**
 * Hypercore wrapper factory.
 */
export class HypercoreFactory {
  constructor (
    private readonly _storage: RandomAccessFileConstructor = ram
  ) {
    assert(this._storage);
  }

  /**
   * Creates a pify wrapped hypercore object.
   */
  create (publicKey?: PublicKey, options?: FeedOptions): HypercoreFeed {
    const key = publicKey ? Buffer.from(sha256(publicKey.toHex())) : undefined;
    const feed = hypercore(this._storage, key, options ?? defaultFeedOptions);
    return pify(feed);
  }
}
