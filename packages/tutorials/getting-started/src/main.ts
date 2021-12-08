//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Client } from '@dxos/client';

const log = debug('dxos:test');
debug.enable('dxos:test');

// TODO(burdon): Purpose: demonstrate hello world. Simple chat applicaiton? (Each peer with stable ID, local store.)

// TODO(burdon): Local storage (unique per client?)
const main = async () => {
  const client = new Client({}); // TODO(burdon): Disable network.
  await client.initialize();
  log(String(client));

  const profile = await client.halo.createProfile();
  log(`User: ${profile.username}`);

  await client.destroy(); // TODO(burdon): Should not be required unless mesh is swarming?
};

void main();
