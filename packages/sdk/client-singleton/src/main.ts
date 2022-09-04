//
// Copyright 2022 DXOS.org
//

import { clientServiceBundle } from '@dxos/client';
import { Client } from '@dxos/client/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { createBundledRpcServer } from '@dxos/rpc';
import { openPort } from '@dxos/rpc-worker-proxy';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './worker-proxy?sharedworker';

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    let client: Client;
    const worker = new SharedWorker();

    await openPort({
      worker,
      onSetupProvider: async port => {
        const config = new Config(await Dynamics(), Defaults());
        client = new Client(config);
        await client.initialize();

        return createBundledRpcServer({
          services: clientServiceBundle,
          handlers: client.services,
          port
        });
      },
      onSetupProxy: port => createBundledRpcServer({
        services: clientServiceBundle,
        handlers: client.services,
        port
      })
    });
  })();
} else {
  throw new Error('DXOS Client singleton requires a browser with support for shared workers.');
}
