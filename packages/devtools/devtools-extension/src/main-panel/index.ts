//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { Client } from '@dxos/client';

import { createDevtoolsPort } from '../utils';
import { initPanel } from './init-panel';

// TODO(burdon): No code in index file.
void (async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  const port = createDevtoolsPort();
  const client = new Client({ system: { remote: true } }, { rpcPort: port });
  await client.initialize();
  initPanel(client);
})();
