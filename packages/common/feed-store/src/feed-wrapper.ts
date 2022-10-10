//
// Copyright 2019 DXOS.org
//

import type { wrapFeed, HypercoreFeedObject, HypercoreFeed } from '@dxos/hypercore';

// TODO(burdon): New wrapper.
// TODO(burdon): Use factor to create mocks (why is that required?)
// TODO(burdon): Why is the semaphore required on open.
export class Wrapper {
  private readonly _feed: HypercoreFeed;

  constructor (
    private readonly _hypercore: HypercoreFeedObject
  ) {
    this._feed = wrapFeed(this._hypercore);
  }

  // TODO(burdon): Internal only.
  get hypercore (): HypercoreFeedObject {
    return this._hypercore;
  }

  get feed (): HypercoreFeed {
    return this._feed;
  }
}
