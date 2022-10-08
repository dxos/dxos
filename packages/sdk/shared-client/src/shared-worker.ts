//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
import { Client, clientServiceBundle } from '@dxos/client';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

const client = new Client({ runtime: { client: { mode: 1 /* local */ } } });
const [clientInitialized, resolve] = trigger();
void client.initialize().then(resolve);

onconnect = async event => {
  const muxer = new PortMuxer(event.ports[0]);
  const port = muxer.createWorkerPort({ channel: 'dxos' });
  await clientInitialized();

  const server = createProtoRpcPeer({
    requested: {},
    exposed: clientServiceBundle,
    handlers: client.services,
    port
  });

  await server.open();
};
