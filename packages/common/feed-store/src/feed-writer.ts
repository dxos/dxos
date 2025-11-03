//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

export type WriteReceipt = {
  feedKey: PublicKey;
  seq: number;
};

export type WriteOptions = {
  /**
   * Called after the write is complete.
   * Runs and completes before the mutation is read from the pipeline.
   */
  afterWrite?: (receipt: WriteReceipt) => Promise<void>;
};

export interface FeedWriter<T extends {}> {
  /**
   * Write data to the feed.
   * Awaits `afterWrite` before returning.
   */
  write(data: T, options?: WriteOptions): Promise<WriteReceipt>;
}

export const createFeedWriter = <T extends {}>(cb: (data: T) => Promise<WriteReceipt>): FeedWriter<T> => ({
  write: async (data: T) => cb(data),
});

export const writeMessages = async <T extends {}>(writer: FeedWriter<T>, messages: T[]): Promise<WriteReceipt[]> => {
  const receipts: WriteReceipt[] = [];
  // NOTE: Write messages sequentially.
  for (const message of messages) {
    receipts.push(await writer.write(message));
  }
  return receipts;
};
