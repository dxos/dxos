//
// Copyright 2023 DXOS.org
//

import { truncateKey } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';

export const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key) : key.toHex());
