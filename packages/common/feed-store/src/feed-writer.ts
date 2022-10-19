//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type WriteReceipt = {
  feedKey: PublicKey
  seq: number
}

/**
 * Async feed writer.
 */
export interface FeedWriter<T = any> {
  write (data: T): Promise<WriteReceipt>
}
