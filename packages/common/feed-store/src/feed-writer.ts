//
// Copyright 2020 DXOS.org
//

import pify from 'pify';

import { Event } from '@dxos/async';
import type { FeedDescriptor } from '@dxos/feed-store';
import { PublicKey, PUBLIC_KEY_LENGTH } from '@dxos/keys';
import { MaybePromise } from '@dxos/util';

export interface WriteReceipt {
  feedKey: PublicKey
  seq: number
}

export interface FeedWriter<T> {
  write: (message: T) => Promise<WriteReceipt>
}

export const mapFeedWriter = <T, U>(map: (arg: T) => MaybePromise<U>, writer: FeedWriter<U>): FeedWriter<T> => ({
  write: async message => writer.write(await map(message))
});

export const createFeedWriter = <T>(feed: FeedDescriptor): FeedWriter<T> => ({
  write: async message => {
    const seq = await feed.append(message);
    return {
      feedKey: PublicKey.from(feed.key),
      seq
    };
  }
});

export const createMockFeedWriterFromStream = (strem: NodeJS.WritableStream): FeedWriter<any> => ({
  write: async message => {
    await pify(strem.write.bind(strem))(message);
    return {
      feedKey: PublicKey.from(Buffer.alloc(PUBLIC_KEY_LENGTH)),
      seq: 0
    };
  }
});

export class MockFeedWriter<T> implements FeedWriter<T> {
  readonly messages: T[] = [];

  readonly written = new Event<[T, WriteReceipt]>();

  constructor (
    readonly feedKey = PublicKey.random()
  ) {}

  async write (message: T): Promise<WriteReceipt> {
    this.messages.push(message);

    const receipt: WriteReceipt = {
      feedKey: this.feedKey,
      seq: this.messages.length - 1
    };

    this.written.emit([message, receipt]);

    return receipt;
  }
}
