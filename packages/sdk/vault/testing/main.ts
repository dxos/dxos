//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

void (async () => {
  const client = new Client({ runtime: { client: { mode: 2 /* remote */ } } });
  await client.initialize();

  console.log(client.info);
})();
