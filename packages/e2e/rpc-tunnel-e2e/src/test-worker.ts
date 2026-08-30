//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { getBufService } from '@dxos/protocols/buf-service';
import { type TestStreamService } from '@dxos/protocols/proto/example/testing/rpc';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { Channels } from './channels';
import { TestClient } from './test-client';

const clientOne = new TestClient();
const clientTwo = new TestClient({ value: 10050 });

onconnect = async (event) => {
  log.info('connect', { event });
  const muxer = new PortMuxer(event.ports[0]);

  await Promise.all([setup(muxer, Channels.ONE, clientOne), setup(muxer, Channels.TWO, clientTwo)]);
};

const setup = async (muxer: PortMuxer, channel: string, client: TestClient) => {
  const port = muxer.createWorkerPort({ channel });

  const server = createProtoRpcPeer({
    exposed: {
      TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
    },
    handlers: client.handlers,
    port,
  });

  await server.open();
};
