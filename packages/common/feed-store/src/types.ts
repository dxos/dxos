//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type FeedBlock<T> = {
  key: PublicKey
  seq: number
  data: T
}
