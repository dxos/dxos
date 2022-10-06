//
// Copyright 2021 DXOS.org
//

import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { webRTCTests, inMemoryTests, webRTCProxyTests } from './network-manager.blueprint-test';
import { WebRTCTransportService } from './transport';

const PORT = 12087;

describe('Network manager', () => {
  describe('WebRTC transport', () => {
    let broker: TestBroker;

    before(async () => {
      broker = await createTestBroker(PORT);
    });

    after(() => {
      broker?.stop();
    });

    webRTCTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal` });
  }).timeout(10_000);

  describe('WebRTC proxy transport', () => {
    let broker: TestBroker;
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

    before(async () => {
      broker = await createTestBroker(PORT);
      await service.open();
      await rpcClient.open();
    });

    after(() => {
      broker?.stop();
      service.close();
      rpcClient.close();
    });

    webRTCProxyTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal`, bridgeService: rpcClient.rpc.BridgeService });
  });

  describe('In-memory transport', () => {
    inMemoryTests();
  }).timeout(30_000);
});
