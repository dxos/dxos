//
// Copyright 2025 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export const createTmpPath = (): string => {
  return `/tmp/dxos-${PublicKey.random().toHex()}`;
};
