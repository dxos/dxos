//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { ClientServiceHost } from 'packages/sdk/client-services/dist/src';

void (async () => {
  const iframe = document.getElementById('client') as HTMLIFrameElement;
  const rpcPort = createIFramePort({ iframe, origin: 'http://localhost:5137', channel: 'dxos' });
  const client = new Client({ runtime: { client: { mode: 2 }}}, { rpcPort });
  await client.initialize();

  if(!client.halo.profile) {
    await client.halo.createProfile();
  }

  console.log(client.info);
})();
