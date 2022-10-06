//
// Copyright 2021 DXOS.org
//

import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
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
    let service: ProtoRpcPeer<{}>;
    let rpcClient: ProtoRpcPeer<{ BridgeService: BridgeService }>;
    const [rpcPortA, rpcPortB] = createLinkedPorts();

    before(async () => {
      broker = await createTestBroker(PORT);

      const webRTCTransportService: BridgeService = new WebRTCTransportService();
      service = createProtoRpcPeer({
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
      await service.open();

      rpcClient = createProtoRpcPeer({
        requested: { BridgeService: schema.getService('dxos.mesh.bridge.BridgeService') },
        exposed: { },
        handlers: { },
        port: rpcPortB,
        noHandshake: true,
        encodingOptions: {
          preserveAny: true
        }
      });
      await rpcClient.open();
    });

    after(() => {
      broker?.stop();
      service?.close();
      rpcClient?.close();
    });

    webRTCProxyTests({ signalUrl: `ws://localhost:${PORT}/.well-known/dx/signal`, bridgeService: rpcClient!.rpc.BridgeService });
  });

  describe('In-memory transport', () => {
    inMemoryTests();
  }).timeout(30_000);
});
