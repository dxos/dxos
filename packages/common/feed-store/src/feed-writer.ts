//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type WriteReceipt = {
  feedKey: PublicKey;
  seq: number;
};

export interface FeedWriter<T extends {}> {
  write(data: T): Promise<WriteReceipt>;
}

export const createFeedWriter = <T extends {}>(cb: (data: T) => Promise<WriteReceipt>): FeedWriter<T> => ({
  write: async (data: T) => {
    return cb(data);
  }
});

export const writeMessages = async <T extends {}>(writer: FeedWriter<T>, messages: T[]): Promise<WriteReceipt[]> => {
  const receipts: WriteReceipt[] = []
  // NOTE: Write messages sequentially.
  for(const message of messages) {
    receipts.push(await writer.write(message));
  }
  return receipts;
}
