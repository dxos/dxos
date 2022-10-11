//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
<<<<<<< HEAD:packages/sdk/vault/src/shared-worker.ts
import { ClientServiceHost, clientServiceBundle } from '@dxos/client';
import { Config } from '@dxos/config';
=======
import { Client, clientServiceBundle } from '@dxos/client';
import { schema } from '@dxos/protocols';
>>>>>>> 96444ff... WIP Add webrtc networking to service worker:packages/sdk/shared-client/src/shared-worker.ts
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';
import { ClientServiceHost } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { WebRTCTransportProxy } from '@dxos/network-manager';

<<<<<<< HEAD:packages/sdk/vault/src/shared-worker.ts
const client = new ClientServiceHost(
  // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite. Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
  new Config({ runtime: { client: { mode: 1 /* local */ } } })
);
const [clientReady, resolve] = trigger();
=======
const transportFactory = new WebRTCTransportProxy()
const client = new ClientServiceHost({
  // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite. Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
  config: new Config({ runtime: { client: { mode: 1 /* local */ } } }),
  transportFactory: 
});
const [clientInitialized, resolve] = trigger();
>>>>>>> 96444ff... WIP Add webrtc networking to service worker:packages/sdk/shared-client/src/shared-worker.ts
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
