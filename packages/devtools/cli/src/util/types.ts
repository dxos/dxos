//
// Copyright 2023 DXOS.org
//

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

export const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key) : key.toHex());

export const safeParseInt = (value: string | undefined, defaultValue?: number): number | undefined => {
  try {
    const n = parseInt(value ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch (err) {
    return defaultValue;
  }
};
