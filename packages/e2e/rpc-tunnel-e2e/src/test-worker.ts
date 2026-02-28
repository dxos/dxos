//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { TestStreamService } from '@dxos/protocols/buf/example/testing/rpc_pb';
import { createBufProtoRpcPeer } from '@dxos/rpc';
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

  const server = createBufProtoRpcPeer({
    exposed: {
      TestStreamService,
    },
    handlers: client.handlers,
    port,
  });

  await server.open();
};
