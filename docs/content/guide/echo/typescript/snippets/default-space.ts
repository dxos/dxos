//
// Copyright 2024 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  // ensure the spaces are loaded before trying to load a space
  await client.spaces.waitUntilReady();

  // get the default space
  const defaultSpace = client.spaces.default;
})();
