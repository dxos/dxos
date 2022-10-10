//
// Copyright 2021 DXOS.org
//

// @dxos/mocha platform=nodejs

import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { webRTCTests, inMemoryTests, webRTCProxyTests } from './network-manager.blueprint-test.js';
import { WebRTCTransportService } from './transport/index.js';

const PORT = 12087;

describe('Network manager', function () {
  describe('WebRTC transport', function () {
    let broker: TestBroker;

    before(async function () {
      broker = await createTestBroker(PORT);
    });

    after(function () {
      broker?.stop();
    });

    webRTCTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal` });
  }).timeout(10_000);

  describe('WebRTC proxy transport', function () {
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

    before(async function () {
      broker = await createTestBroker(PORT);
      await service.open();
      await rpcClient.open();
    });

    after(function () {
      broker?.stop();
      service.close();
      rpcClient.close();
    });

    webRTCProxyTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal`, bridgeService: rpcClient.rpc.BridgeService });
  });

  describe('In-memory transport', function () {
    inMemoryTests();
  }).timeout(30_000);
});
