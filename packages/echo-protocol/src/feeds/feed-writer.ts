//
// Copyright 2020 DXOS.org
//

import { Feed } from 'hypercore';
import pify from 'pify';

import { PublicKey } from '@dxos/crypto';
import { MaybePromise } from '@dxos/util';

import { FeedKey } from '../types';

export interface WriteReceipt {
  feedKey: FeedKey
  seq: number
}

export interface FeedWriter<T> {
  write: (message: T) => Promise<WriteReceipt>
}

export function mapFeedWriter<T, U> (map: (arg: T) => MaybePromise<U>, writer: FeedWriter<U>): FeedWriter<T> {
  return {
    write: async message => writer.write(await map(message))
  };
}

export function createFeedWriter<T> (feed: Feed): FeedWriter<T> {
  return {
    write: async message => {
      const seq = await pify(feed.append.bind(feed))(message);
      return {
        feedKey: PublicKey.from(feed.key),
        seq
      };
    }
  };
}

export function createMockFeedWriterFromStream (strem: NodeJS.WritableStream): FeedWriter<any> {
  return {
    write: async message => {
      await pify(strem.write.bind(strem))(message);
      return {
        feedKey: PublicKey.from(Buffer.alloc(PublicKey.LENGTH)),
        seq: 0
      };
    }
  };
}
