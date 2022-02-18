//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { defs } from '@dxos/config';
import { Client } from '@dxos/client';

import { createDevtoolsPort } from '../utils';
import { initPanel } from './init-panel';

void (async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  const port = createDevtoolsPort();
  const client = new Client({
    runtime: {
      client: {
        mode: defs.Runtime.Client.Mode.REMOTE
      }
    }
  }, { rpcPort: port });
  await client.initialize();
  initPanel(client);
})();
