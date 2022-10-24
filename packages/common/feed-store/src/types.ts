//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type FeedBlock<T> = {
  feedKey: PublicKey
  seq: number
  data: T
}
