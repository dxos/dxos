//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { TestStream } from '@dxos/async';
import { schema } from '@dxos/protocols';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createLinkedPorts, createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { afterAll, afterTest, beforeAll, describe, test } from '@dxos/test';

import { SimplePeerTransportProxy } from './simplepeer-transport-proxy';
import { SimplePeerTransportService } from './simplepeer-transport-service';

describe('SimplePeerTransportProxy', () => {
  const setupProxy = async ({
    initiator = true,
    stream = new TestStream(),
    sendSignal = async () => {},
  }: {
    initiator?: boolean;
    stream?: NodeJS.ReadWriteStream;
    sendSignal?: (msg: Signal) => Promise<void>;
  } = {}) => {
    const [port1, port2] = createLinkedPorts();

    // Starting BridgeService
    const simplePeerTransportService: BridgeService = new SimplePeerTransportService();

    // Starting BridgeService
    const rpcService = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
      },
      handlers: { BridgeService: simplePeerTransportService },
      port: port1,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true,
      },
    });
    await rpcService.open();
    afterTest(() => rpcService.close());

    // Starting RPC client
    const rpcClient = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
      },
      port: port2,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true,
      },
    });
    await rpcClient.open();
    afterTest(() => rpcClient.close());

    const simplePeerTransportProxy = new SimplePeerTransportProxy({
      initiator,
      stream,
      sendSignal,
      bridgeService: rpcClient.rpc.BridgeService,
    });
    await simplePeerTransportProxy.open();
    afterTest(async () => await simplePeerTransportProxy.close());

    return { simplePeerService: rpcService, SimplePeerTransportProxy: simplePeerTransportProxy };
  };

  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  test('open and close', async () => {
    const { SimplePeerTransportProxy: connection } = await setupProxy();

    const wait = connection.closed.waitForCount(1);
    await connection.close();
    await wait;
  }).timeout(1_000);

  test('establish connection and send data through with protocol', async () => {
    const stream1 = new TestStream();
    const { SimplePeerTransportProxy: connection1 } = await setupProxy({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        await connection2.onSignal(signal);
      },
    });
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const { SimplePeerTransportProxy: connection2 } = await setupProxy({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        await connection1.onSignal(signal);
      },
    });
    afterTest(() => connection2.errors.assertNoUnhandledErrors());
    await TestStream.assertConnectivity(stream1, stream2);
  }).timeout(2_000);

  describe('Multiplexing', () => {
    let service: any;
    let rpcClient: ProtoRpcPeer<{ BridgeService: BridgeService }>;

    beforeAll(async () => {
      const [port1, port2] = createLinkedPorts();

      const simplePeerTransportService: BridgeService = new SimplePeerTransportService();
      service = createProtoRpcPeer({
        exposed: {
          BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
        },
        handlers: { BridgeService: simplePeerTransportService },
        port: port1,
        noHandshake: true,
        encodingOptions: {
          preserveAny: true,
        },
      });
      await service.open();

      rpcClient = createProtoRpcPeer({
        requested: {
          BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
        },
        port: port2,
        noHandshake: true,
        encodingOptions: {
          preserveAny: true,
        },
      });
      await rpcClient.open();
    });

    afterAll(async () => {
      await service?.close();
      await rpcClient?.close();
    });

    test('establish connection and send data through with protocol', async () => {
      const stream1 = new TestStream();
      const proxy1 = new SimplePeerTransportProxy({
        initiator: true,
        stream: stream1,
        sendSignal: async (signal) => {
          await proxy2.onSignal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService,
      });
      afterTest(async () => {
        proxy1.errors.assertNoUnhandledErrors();
        await proxy1.close();
      });

      const stream2 = new TestStream();
      const proxy2 = new SimplePeerTransportProxy({
        initiator: false,
        stream: stream2,
        sendSignal: async (signal) => {
          await proxy1.onSignal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService,
      });
      afterTest(async () => {
        proxy2.errors.assertNoUnhandledErrors();
        await proxy2.close();
      });

      await proxy1.open();
      await proxy2.open();

      await TestStream.assertConnectivity(stream1, stream2);
    }).timeout(3_000);
  });
});
