//
// Copyright 2021 DXOS.org
//

import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';

import { webRTCTests, inMemoryTests, webRTCProxyTests } from './network-manager.blueprint-test';
import { WebRTCTransportService } from './transport';

// Signal server will be started by the setup script.
const SIGNAL_URL = `ws://localhost:4000/.well-known/dx/signal`;

describe('Network manager', function () {
  describe('WebRTC transport', function () {
    webRTCTests({ signalUrl: SIGNAL_URL });
  }).timeout(10_000);

  describe('WebRTC proxy transport', function () {
    const [rpcPortA, rpcPortB] = createLinkedPorts();

    const webRTCTransportService: BridgeService = new WebRTCTransportService();
    const service = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      handlers: { BridgeService: webRTCTransportService },
      port: rpcPortA,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });

    const rpcClient = createProtoRpcPeer({
      requested: { BridgeService: schema.getService('dxos.mesh.bridge.BridgeService') },
      exposed: { },
      handlers: { },
      port: rpcPortB,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });

    before(async function () {
      await service.open();
      await rpcClient.open();
    });

    after(function () {
      service.close();
      rpcClient.close();
    });

    webRTCProxyTests({ signalUrl: SIGNAL_URL, bridgeService: rpcClient.rpc.BridgeService });
  });

  describe('In-memory transport', function () {
    inMemoryTests();
  }).timeout(30_000);
});
