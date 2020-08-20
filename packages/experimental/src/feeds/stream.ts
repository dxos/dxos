//
// Copyright 2020 DXOS.org
//

import { Feed } from 'hypercore';
import { Writable } from 'stream';

/**
 * Returns a stream that appends messages directly to a hypercore feed.
 * @param feed
 * @returns {NodeJS.WritableStream}
 */
export const createWritableFeedStream = (feed: Feed) => new Writable({
  objectMode: true,
  write (message, _, callback) {
    feed.append(message, callback);
  }
});
