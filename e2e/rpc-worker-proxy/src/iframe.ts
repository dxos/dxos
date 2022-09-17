//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { createRpcServer } from '@dxos/rpc';
import { openPort } from '@dxos/rpc-worker-proxy';

import { schema } from './proto';
import { TestClient } from './test-client';
// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './worker-proxy?sharedworker';

debug.enable('*');

let client: TestClient;

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker();
    const service = schema.getService('dxos.testing.rpc.TestStreamService');

    await openPort({
      worker,
      onSetupProvider: async port => {
        client = new TestClient();

        return createRpcServer({
          service,
          handlers: client.handlers,
          port
        });
      },
      onSetupProxy: port => createRpcServer({
        service,
        handlers: client.handlers,
        port
      })
    });
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
