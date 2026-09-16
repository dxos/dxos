//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

export type HypercoreBlock<T> = {
  feedKey: PublicKey;
  seq: number;
  data: T;
};
