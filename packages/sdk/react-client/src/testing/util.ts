//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/client';
import { type ConfigProto } from '@dxos/config';

export const testConfig = (): ConfigProto => ({
  runtime: {
    client: { storage: { persistent: false, dataRoot: `/tmp/dxos-${PublicKey.random().toHex()}` } },
  },
});
