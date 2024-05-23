//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

// create a client
const client = new Client();

const main = async () => {
  await client.initialize();
  // use client here

};

main();