//
// Copyright 2019 DXOS.org
//

import pify from 'pify';

import type { Hypercore, HypercoreFeed } from '@dxos/hypercore';

// TODO(burdon): New wrapper.
// TODO(burdon): Use factor to create mocks (why is that required?)
// TODO(burdon): Why is the semaphore required on open.
export class Wrapper {
  private readonly _feed: HypercoreFeed;

  constructor (
    private readonly _hypercore: Hypercore
  ) {
    this._feed = pify(this._hypercore);
  }

  // TODO(burdon): Internal only.
  get hypercore (): Hypercore {
    return this._feed;
  }

  get feed (): HypercoreFeed {
    return this._feed;
  }
}
