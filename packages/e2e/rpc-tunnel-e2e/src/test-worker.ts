//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { Channels } from './channels';
import { TestClient } from './test-client';

const clientOne = new TestClient();
const clientTwo = new TestClient({ value: 10050 });

onconnect = async (event) => {
  const muxer = new PortMuxer(event.ports[0]);

  await Promise.all([setup(muxer, Channels.ONE, clientOne), setup(muxer, Channels.TWO, clientTwo)]);
};

const setup = async (muxer: PortMuxer, channel: string, client: TestClient) => {
  const port = muxer.createPort({ channel });

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
