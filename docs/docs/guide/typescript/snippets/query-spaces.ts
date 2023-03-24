//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  // get a list of all spaces
  const spaces = client.spaces.get();
})()
