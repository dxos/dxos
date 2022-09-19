//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { TestClient } from './test-client';

onconnect = async (event: MessageEvent<any>) => {
  const port = createWorkerPort(event.ports[0]);
  const client = new TestClient();
  const server = createProtoRpcPeer({
    requested: {},
    exposed: {
      TestStreamService: schema.getService('example.testing.rpc.TestStreamService')
    },
    handlers: client.handlers,
    port
  });
  await server.open();
};
