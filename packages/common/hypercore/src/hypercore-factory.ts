//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import hypercore, { FeedOptions } from 'hypercore';
import pify from 'pify';
import type { Constructor as RandomAccessFileConstructor } from 'random-access-file';
import ram from 'random-access-memory';

import { sha256 } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

import { defaultFeedOptions } from './defaults';
import { HypercoreFeed } from './hypercore-feed';

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
