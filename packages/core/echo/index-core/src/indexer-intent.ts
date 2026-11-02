//
// Copyright 2026 DXOS.org
//

import { type Feed } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

/**
 * "Check whether the group named by this convergence key needs merging", recorded for every keyed
 * object the indexer processes (see {@link ConvergenceKeyIntentStore}).
 */
export type ConvergenceKeyIntent = {
  kind: 'convergence-key';
  spaceId: SpaceId;
  convergenceKey: string;
};

/**
 * "Apply these options to this feed's store", recorded for every indexed Feed object (see
 * {@link FeedOptionsIntentStore}). `options` holds what the object carries, with invalid fields left out.
 */
export type FeedOptionsIntent = {
  kind: 'feed-options';
  spaceId: SpaceId;
  /** The Feed object's entity id, which is also the feed's id in the feed store. */
  feedId: string;
  namespace: string;
  options: Feed.FeedOptions;
};

/**
 * Durable follow-up work the indexer records in the transaction that writes the index rows of the
 * object that caused it, so a crash cannot lose it.
 */
export type IndexerIntent = ConvergenceKeyIntent | FeedOptionsIntent;
