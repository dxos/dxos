//
// Copyright 2022 DXOS.org
//

import type { FeedOptions, ReplicateOptions } from './types';

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
export const defaultReplicateOptions: ReplicateOptions = {
  live: false
};
