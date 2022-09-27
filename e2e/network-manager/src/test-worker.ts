//
// Copyright 2022 DXOS.org
//

import { WebRTCTransportService } from '@dxos/network-manager';
import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createWorkerPort, MessageChannel } from '@dxos/rpc-tunnel';

const setup = async (port: RpcPort) => {
  const webRTCTransportService: BridgeService = new WebRTCTransportService();

  // Starting WebRTCService
  const server = createProtoRpcPeer({
    requested: {},
    exposed: {
      BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
    },
    handlers: { BridgeService: webRTCTransportService },
    port,
    noHandshake: true,
    encodingOptions: {
      preserveAny: true
    }
  });

  await server.open();
};

const channel = new MessageChannel(async (channel, port) => {
  await setup(
    createWorkerPort({ channel, port, source: 'child', destination: 'parent' })
  );
});

onconnect = event => channel.onConnect(event);
