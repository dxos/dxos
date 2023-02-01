//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import expect from 'expect';

import { sleep, TestStream } from '@dxos/async';
import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { afterAll, afterTest, beforeAll, describe, test } from '@dxos/test';

import { WebRTCTransportProxy } from './webrtc-transport-proxy';
import { WebRTCTransportService } from './webrtc-transport-service';

describe('WebRTCTransportProxy', () => {
  const setupProxy = async ({
    initiator = true,
    stream = new TestStream(),
    sendSignal = async () => {}
  }: {
    initiator?: boolean;
    stream?: NodeJS.ReadWriteStream;
    sendSignal?: (msg: Signal) => Promise<void>;
  } = {}) => {
    const [port1, port2] = createLinkedPorts();

    // Starting BridgeService
    const webRTCTransportService: BridgeService = new WebRTCTransportService();

    // Starting BridgeService
    const rpcService = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      handlers: { BridgeService: webRTCTransportService },
      port: port1,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });
    await rpcService.open();
    afterTest(() => rpcService.close());

    // Starting RPC client
    const rpcClient = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      port: port2,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true
      }
    });
    await rpcClient.open();
    afterTest(() => rpcClient.close());

    const webRTCTransportProxy = new WebRTCTransportProxy({
      initiator,
      stream,
      sendSignal,
      bridgeService: rpcClient.rpc.BridgeService
    });
    afterTest(async () => await webRTCTransportProxy.destroy());

    return { webRTCService: rpcService, webRTCTransportProxy };
  };

  // This doesn't clean up correctly and crashes with SIGSEGV / SIGABRT at the end. Probably an issue with wrtc package.
  test('open and close', async () => {
    const { webRTCTransportProxy: connection } = await setupProxy();

    let callsCounter = 0;
    const closedCb = () => {
      callsCounter++;
    };
    connection.closed.once(closedCb);

    await sleep(10); // Let simple-peer process events.
    await connection.destroy();

    await sleep(1); // Process events.

    expect(callsCounter).toEqual(1);
  })
    .timeout(1_000)
    .tag('e2e');

  test('establish connection and send data through with protocol', async () => {
    const stream1 = new TestStream();
    const { webRTCTransportProxy: connection1 } = await setupProxy({
      initiator: true,
      stream: stream1,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection2.signal(signal);
      }
    });
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const stream2 = new TestStream();
    const { webRTCTransportProxy: connection2 } = await setupProxy({
      initiator: false,
      stream: stream2,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection1.signal(signal);
      }
    });
    afterTest(() => connection2.errors.assertNoUnhandledErrors());
    await TestStream.assertConnectivity(stream1, stream2);
  })
    .timeout(2_000)
    .tag('e2e');

  describe('Multiplexing', () => {
    let service: any;
    let rpcClient: ProtoRpcPeer<{ BridgeService: BridgeService }>;

    beforeAll(async () => {
      const [port1, port2] = createLinkedPorts();

      const webRTCTransportService: BridgeService = new WebRTCTransportService();
      service = createProtoRpcPeer({
        exposed: {
          BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
        },
        handlers: { BridgeService: webRTCTransportService },
        port: port1,
        noHandshake: true,
        encodingOptions: {
          preserveAny: true
        }
      });
      await service.open();

      rpcClient = createProtoRpcPeer({
        requested: {
          BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
        },
        port: port2,
        noHandshake: true,
        encodingOptions: {
          preserveAny: true
        }
      });
      await rpcClient.open();
    });

    afterAll(async () => {
      await service?.close();
      await rpcClient?.close();
    });

    test('establish connection and send data through with protocol', async () => {
      const stream1 = new TestStream();
      const proxy1 = new WebRTCTransportProxy({
        initiator: true,
        stream: stream1,
        sendSignal: async (signal) => {
          await sleep(10);
          await proxy2.signal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService
      });
      afterTest(() => proxy1.errors.assertNoUnhandledErrors());

      const stream2 = new TestStream();
      const proxy2 = new WebRTCTransportProxy({
        initiator: false,
        stream: stream2,
        sendSignal: async (signal) => {
          await sleep(10);
          await proxy1.signal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService
      });
      afterTest(() => proxy2.errors.assertNoUnhandledErrors());

      await TestStream.assertConnectivity(stream1, stream2);
    })
      .timeout(3_000)
      .tag('e2e');
  });
});
