//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';
import { createProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { createWorkerPort, MessageChannel } from '@dxos/rpc-tunnel';
import { BridgeService } from '@dxos/protocols/src/proto/gen/dxos/mesh/bridge';
import { WebRTCTransportService } from '@dxos/network-manager';


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
  )
});

onconnect = event => channel.onConnect(event);
