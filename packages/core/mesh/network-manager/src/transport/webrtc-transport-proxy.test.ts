//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import { Duplex } from 'stream';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { discoveryKey } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { schema } from '@dxos/protocols';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createLinkedPorts, createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { TestProtocolPlugin, testProtocolProvider } from '../testing';
import { WebRTCTransportProxy } from './webrtc-transport-proxy';
import { WebRTCTransportService } from './webrtc-transport-service';

describe('WebRTCTransportProxy', function () {
  const setupProxy = async ({
    initiator = true,
    stream = new Duplex({ write: () => {}, read: () => {} }),
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
  it('open and close', async function () {
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
    .retries(3);

  it('establish connection and send data through with protocol', async function () {
    if (mochaExecutor.environment !== 'nodejs') {
      this.skip();
    }

    const topic = PublicKey.random();
    const peer1Id = PublicKey.random();
    const peer2Id = PublicKey.random();

    const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
    const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id, plugin1);
    const { webRTCTransportProxy: connection1 } = await setupProxy({
      initiator: true,
      stream: protocolProvider1({
        channel: discoveryKey(topic),
        initiator: true
      }).stream,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection2.signal(signal);
      }
    });
    afterTest(() => connection1.errors.assertNoUnhandledErrors());

    const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
    const protocolProvider2 = testProtocolProvider(topic.asBuffer(), peer2Id, plugin2);
    const { webRTCTransportProxy: connection2 } = await setupProxy({
      initiator: false,
      stream: protocolProvider2({
        channel: discoveryKey(topic),
        initiator: false
      }).stream,
      sendSignal: async (signal) => {
        await sleep(10);
        await connection1.signal(signal);
      }
    });
    afterTest(() => connection2.errors.assertNoUnhandledErrors());

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async (protocol) => {
      await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
    });
    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('{"message": "Hello"}');
    });
  })
    .timeout(2_000)
    .retries(3);

  describe('Multiplexing', function () {
    let service: any;
    let rpcClient: ProtoRpcPeer<{ BridgeService: BridgeService }>;

    before(async function () {
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

    after(async function () {
      await service?.close();
      await rpcClient?.close();
    });

    it('establish connection and send data through with protocol', async function () {
      const topic = PublicKey.random();
      const peer1Id = PublicKey.random();
      const peer2Id = PublicKey.random();

      const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
      const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id, plugin1);
      const proxy1 = new WebRTCTransportProxy({
        initiator: true,
        stream: protocolProvider1({
          channel: discoveryKey(topic),
          initiator: true
        }).stream,
        sendSignal: async (signal) => {
          await sleep(10);
          await proxy2.signal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService
      });
      afterTest(() => proxy1.errors.assertNoUnhandledErrors());

      const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
      const protocolProvider2 = testProtocolProvider(topic.asBuffer(), peer2Id, plugin2);
      const proxy2 = new WebRTCTransportProxy({
        initiator: false,
        stream: protocolProvider2({
          channel: discoveryKey(topic),
          initiator: false
        }).stream,
        sendSignal: async (signal) => {
          await sleep(10);
          await proxy1.signal(signal);
        },
        bridgeService: rpcClient.rpc.BridgeService
      });
      afterTest(() => proxy2.errors.assertNoUnhandledErrors());

      const received: any[] = [];
      const mockReceive = (p: Protocol, s: string) => {
        received.push(p, s);
        return undefined;
      };
      plugin1.on('receive', mockReceive);

      plugin2.on('connect', async (protocol) => {
        await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
      });

      await waitForExpect(() => {
        expect(received.length).toBe(2);
        expect(received[0]).toBeInstanceOf(Protocol);
        expect(received[1]).toBe('{"message": "Hello"}');
      });
    })
      .timeout(5_000)
      .retries(3);
  });
});
