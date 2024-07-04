//
// Copyright 2023 DXOS.org
//

import { truncateKey } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';

export const matchKeys = (key: PublicKey, str: string[]) => str.filter((str) => key.toHex().startsWith(str)).length > 0;

export const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key) : key.toHex());
