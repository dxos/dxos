//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import type { FeedWriter, WriteReceipt } from '../feed-writer';

/**
 * Mock writer collects and emits messages.
 */
export class MockFeedWriter<T = any> implements FeedWriter<T> {
  public readonly written = new Event<[T, WriteReceipt]>();
  public readonly messages: T[] = [];

  constructor (
    readonly feedKey = PublicKey.random()
  ) {}

  async write (data: T): Promise<WriteReceipt> {
    this.messages.push(data);

    const receipt: WriteReceipt = {
      feedKey: this.feedKey,
      seq: this.messages.length - 1
    };

    this.written.emit([data, receipt]);
    return receipt;
  }
}
