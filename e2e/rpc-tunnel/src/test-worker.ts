//
// Copyright 2022 DXOS.org
//

import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { schema } from './proto';
import { TestClient } from './test-client';

onconnect = async (event: MessageEvent<any>) => {
  const port = createWorkerPort(event.ports[0]);
  const client = new TestClient();
  const server = createProtoRpcPeer({
    requested: {},
    exposed: {
      TestStreamService: schema.getService('dxos.test.rpc.TestStreamService')
    },
    handlers: client.handlers,
    port
  });
  await server.open();
};
