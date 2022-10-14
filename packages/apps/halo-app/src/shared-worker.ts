//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
import { ClientServiceHost, clientServiceBundle } from '@dxos/client';
import { Config } from '@dxos/config';
import { WebRTCTransportProxyFactory } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

const transportFactory = new WebRTCTransportProxyFactory();
const client = new ClientServiceHost({
  // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite. Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
  config: new Config({
    runtime: {
      client: { mode: 1 /* local */ },
      services: {
        signal: {
          server: 'wss://halo.dxos.org/.well-known/dx/signal'
        }
      }
    }
  }),
  transportFactory
});
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

  const wrtcPort = muxer.createWorkerPort({ channel: 'dxos:wrtc' });
  const wrtcServer = createProtoRpcPeer({
    requested: {
      BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
    },
    exposed: {},
    handlers: {},
    port: wrtcPort
  });

  void wrtcServer.open().then(
    () => {
      // TODO(dmaretskyi): Do not overwrite it if is already set, handle tab closure.
      transportFactory.setBridgeService(wrtcServer.rpc.BridgeService);
    },
    err => {
      console.error(err);
    }
  );

  await server.open();
};
