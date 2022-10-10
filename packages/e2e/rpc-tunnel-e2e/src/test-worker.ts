//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createWorkerPort, MessageChannel } from '@dxos/rpc-tunnel';

import { TestClient } from './test-client.js';

const setup = async (port: RpcPort, client: TestClient) => {
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

const channel = new MessageChannel(async (channel, port) => {
  await Promise.all([
    setup(
      createWorkerPort({ channel, port, source: 'child', destination: 'parent' }),
      new TestClient()
    ),
    setup(
      createWorkerPort({ channel, port, source: 'router', destination: 'proxy' }),
      new TestClient({ value: 10050 })
    )
  ]);
});

onconnect = event => channel.onConnect(event);
