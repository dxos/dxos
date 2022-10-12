//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
import { ClientServiceHost, clientServiceBundle } from '@dxos/client';
import { Config } from '@dxos/config';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

const client = new ClientServiceHost(
  // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite. Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
  new Config({ runtime: { client: { mode: 1 /* local */ } } })
);
const [clientReady, resolve] = trigger();
void client.open().then(resolve);

onconnect = async event => {
  const muxer = new PortMuxer(event.ports[0]);
  const port = muxer.createWorkerPort({ channel: 'dxos:app' });
  await clientReady();

  const server = createProtoRpcPeer({
    requested: {},
    exposed: clientServiceBundle,
    handlers: client.services,
    port
  });

  await server.open();
};
