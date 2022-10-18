//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Hypercore } from 'hypercore';
import util from 'node:util';

import { PublicKey } from '@dxos/keys';
import { MaybePromise } from '@dxos/util';

import { FeedWrapper } from './feed-wrapper';

export type WriteReceipt = {
  feedKey: PublicKey
  seq: number
}

export interface FeedWriter<T> {
  write (data: T): Promise<WriteReceipt>
}

/**
 * Async feed writer.
 */
export class FeedWriterImpl<T> implements FeedWriter<T> {
  private readonly _feedKey: PublicKey;

  constructor (
    private readonly _hypercore: Hypercore
  ) {
    assert(this._hypercore);
    this._feedKey = PublicKey.from(this._hypercore.key);
  }

  // TODO(burdon): Returning the feed key is a convenience that should be provided by a closure.
  async write (data: T): Promise<WriteReceipt> {
    const seq = await this._append(data as any);
    return {
      feedKey: this._feedKey,
      seq
    };
  }

  _append = util.promisify(this._hypercore.append.bind(this._hypercore));
}

// TODO(burdon): Why do we need this and FeedWriterImpl?
export const createFeedWriter = <T> (feed: FeedWrapper<T>): FeedWriter<T> => ({
  write: async (data: T) => {
    const seq = await feed.append(data);
    return {
      feedKey: feed.key,
      seq
    };
  }
});

// TODO(burdon): Replace with optional mapper in createFeedWriter.
export const mapFeedWriter = <Source, Target> (
  mapper: (arg: Source) => MaybePromise<Target>,
  writer: FeedWriter<Target>
): FeedWriter<Source> => {
  return {
    write: async (data: Source) => writer.write(await mapper(data))
  };
};
