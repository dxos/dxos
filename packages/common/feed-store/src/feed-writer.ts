//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/keys';
import { MaybePromise } from '@dxos/util';

import { FeedWrapper } from './feed-wrapper';

export type WriteReceipt = {
  feedKey: PublicKey
  seq: number
}

/**
 * Async feed writer.
 */
export interface FeedWriter<T> {
  write (data: T): Promise<WriteReceipt>
}

/**
 * Creates a wrapper function that appends to the feed.
 */
export const createFeedWriter = <T> (feed: FeedWrapper<T>): FeedWriter<T> => {
  assert(feed);

  return {
    write: async (data: T) => {
      const seq = await feed.append(data);
      return {
        feedKey: feed.key,
        seq
      };
    }
  };
};

/**
 * Maps the written arguments onto a different message type.
 */
export const createMappedFeedWriter = <Source, Target> (
  mapper: (arg: Source) => MaybePromise<Target>,
  writer: FeedWriter<Target>
): FeedWriter<Source> => {
  assert(mapper);
  assert(writer);

  return {
    write: async (data: Source) => await writer.write(await mapper(data))
  };
};
