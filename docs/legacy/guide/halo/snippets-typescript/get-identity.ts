//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = client.halo.identity.get();
})();
