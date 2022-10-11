//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
<<<<<<< HEAD:packages/sdk/vault/testing/main.ts

void (async () => {
  const client = new Client({ runtime: { client: { mode: 2 /* remote */ } } });
  await client.initialize();

  if (!client.halo.profile) {
=======
import { createIFramePort } from '@dxos/rpc-tunnel';
import { ClientServiceHost } from 'packages/sdk/client-services/dist/src';

void (async () => {
  const iframe = document.getElementById('client') as HTMLIFrameElement;
  const rpcPort = createIFramePort({ iframe, origin: 'http://localhost:5137', channel: 'dxos' });
  const client = new Client({ runtime: { client: { mode: 2 }}}, { rpcPort });
  await client.initialize();

  if(!client.halo.profile) {
>>>>>>> 96444ff... WIP Add webrtc networking to service worker:packages/sdk/shared-client/testing/main.ts
    await client.halo.createProfile();
  }

  console.log(client.info);
})();
