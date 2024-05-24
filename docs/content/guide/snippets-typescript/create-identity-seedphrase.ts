//
// Copyright 2022 DXOS.org
//

import { Client /*, generateSeedPhrase */ } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  // TODO(dmaretskyi): We don't require a seedphrase anymore.
  const identity = await client.halo.createIdentity({
  });
})();
