//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

const client = new Client();
await client.initialize();

// Ensure an identity exists.
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}

// Create a space.
const _space = await client.spaces.create();
