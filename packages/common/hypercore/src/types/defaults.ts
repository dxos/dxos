//
// Copyright 2022 DXOS.org
//

import type { FeedOptions, FeedReplicationOptions } from './hypercore';

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
 */
export const defaultFeedOptions: FeedOptions = {
  createIfMissing: true,
  valueEncoding: 'binary'
};

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
 */
export const defaultReplicateOptions: FeedReplicationOptions = {
  live: false,
  ack: false,
  download: true,
  upload: true,
  encrypted: true,
  noise: true
};
