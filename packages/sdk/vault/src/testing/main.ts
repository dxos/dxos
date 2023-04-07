//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { log } from '@dxos/log';

void (async () => {
  const client = new Client();
  await client.initialize();

  if (!client.halo.identity) {
    await client.halo.createIdentity();
  }

  log.info('client', client.toJSON());

  if (client.initialized) {
    const element = document.createElement('h1');
    element.textContent = 'Success!';
    document.body.appendChild(element);
  }

  await client.destroy();
})();
