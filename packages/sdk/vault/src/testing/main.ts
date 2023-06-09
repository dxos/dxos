//
// Copyright 2022 DXOS.org
//

import { Client, Config, fromIFrame } from '@dxos/client';
import { log } from '@dxos/log';

void (async () => {
  const config = new Config({ runtime: { client: { remoteSource: 'http://localhost:3967/vault.html' } } });
  const client = new Client({
    config,
    services: fromIFrame(config),
  });
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
