//
// Copyright 2022 DXOS.org
//

import type {
  HypercoreOptions, ReadStreamOptions, ReplicationOptions, WriteStreamOptions
} from 'hypercore';

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-feed--hypercorestorage-key-options
 */
export const defaultFeedOptions: HypercoreOptions = {
  createIfMissing: true,
  valueEncoding: 'binary'
};

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatereadstreamoptions
 */
export const defaultReadStreamOptions: ReadStreamOptions = {
  start: 0,
  end: Infinity,
  snapshot: true,
  tail: false,
  live: false,
  timeout: 0,
  wait: true,
  batch: 1
};

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedcreatewritestreamopts
 */
export const defaultWriteStreamOptions: WriteStreamOptions = {
  maxBlockSize: Infinity
};

/**
 * https://github.com/hypercore-protocol/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
 */
export const defaultReplicateOptions: ReplicationOptions = {
  live: false,
  ack: false,
  download: true,
  upload: true,
  encrypted: true,
  noise: true
};
