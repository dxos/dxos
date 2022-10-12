//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
import { ClientServiceHost, clientServiceBundle } from '@dxos/client';
import { Config } from '@dxos/config';
import { schema } from '@dxos/protocols';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';
import { WebRTCTransportProxy } from '@dxos/network-manager';

const transportFactory = new WebRTCTransportProxy()
const client = new ClientServiceHost({
  // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite. Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
  config: new Config({ runtime: { client: { mode: 1 /* local */ } } }),
  transportFactory: 
});
const [clientInitialized, resolve] = trigger();
void client.open().then(resolve);

onconnect = async event => {
  const muxer = new PortMuxer(event.ports[0]);
  const port = muxer.createWorkerPort({ channel: 'dxos:app' });
  await clientInitialized();

  const server = createProtoRpcPeer({
    requested: {},
    exposed: clientServiceBundle,
    handlers: client.services,
    port
  });
  
  const wrtcPort = muxer.createWorkerPort({ channel: 'dxos:wrtc' });
  const wrtcServer = createProtoRpcPeer({
    requested: {
      BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
    },
    exposed: {},
    handlers: {},
    port: wrtcPort,
  });

  wrtcServer.open().then(() => {
    
  })

  await server.open()
};
