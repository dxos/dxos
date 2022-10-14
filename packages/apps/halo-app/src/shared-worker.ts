//
// Copyright 2022 DXOS.org
//

import { trigger } from '@dxos/async';
import { ClientServiceHost, clientServiceBundle } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { WebRTCTransportProxyFactory } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { createProtoRpcPeer } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

let client: ClientServiceHost;
const transportFactory = new WebRTCTransportProxyFactory();
const [clientReady, resolve] = trigger();

const setup = async () => {
  const config = new Config(await Dynamics(), Defaults(), {
    runtime: {
      client: {
      // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite.
      //   Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
        mode: 1 /* local */
      }
    }
  });

  client = new ClientServiceHost({ config, transportFactory });
  await client.open();
  resolve();
};

void setup();

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
