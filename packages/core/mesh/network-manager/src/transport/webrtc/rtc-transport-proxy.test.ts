//
// Copyright 2020 DXOS.org
//

// @dxos/test platform=nodejs

import { Duplex } from 'stream';

import { TestStream } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createLinkedPorts, createProtoRpcPeer, type RpcPort } from '@dxos/rpc';
import { afterTest, describe, test } from '@dxos/test';

import { RtcTransportProxy } from './rtc-transport-proxy';
import { RtcTransportService } from './rtc-transport-service';
import type { Transport, TransportOptions } from '../transport';

describe('RtcPeerTransportProxy', () => {
  test('open and close', async () => {
    const { proxy } = await setupProxy();
    const wait = proxy.closed.waitForCount(1);
    await proxy.close();
    await wait;
  });

  test('establish connection and send data through with protocol', async () => {
    const peer1 = await setupProxy({
      sendSignal: async (signal) => {
        await peer2.proxy.onSignal(signal);
      },
    });
    assertNoErrorsAfterTest(peer1);

    const peer2 = await setupProxy({
      ownPeerKey: peer1.options.remotePeerKey,
      remotePeerKey: peer1.options.ownPeerKey,
      topic: peer1.options.topic,
      sendSignal: async (signal) => {
        await peer1.proxy.onSignal(signal);
      },
    });
    assertNoErrorsAfterTest(peer2);

    await TestStream.assertConnectivity(peer1.stream, peer2.stream, { timeout: 1500 });
  });

  describe('Multiplexing', () => {
    test('establish connection and send data through with protocol', async () => {
      const [port1, port2] = createLinkedPorts();
      await createService(port1);
      const rpcClient = await createClient(port2);

      const proxy1 = await createProxy(rpcClient, {
        sendSignal: async (signal) => {
          await proxy2.proxy.onSignal(signal);
        },
      });
      assertNoErrorsAfterTest(proxy1);

      const proxy2 = await createProxy(rpcClient, {
        ownPeerKey: proxy1.options.remotePeerKey,
        remotePeerKey: proxy1.options.ownPeerKey,
        topic: proxy1.options.topic,
        sendSignal: async (signal) => {
          await proxy1.proxy.onSignal(signal);
        },
      });
      assertNoErrorsAfterTest(proxy2);

      await proxy1.proxy.open();
      await proxy2.proxy.open();

      await TestStream.assertConnectivity(proxy1.stream, proxy2.stream, { timeout: 1500 });
    });
  });

  const setupProxy = async (overrides?: Partial<TransportOptions>) => {
    const [port1, port2] = createLinkedPorts();
    const service = await createService(port1);
    const rpcClient = await createClient(port2);
    return { service, ...(await createProxy(rpcClient, overrides)) };
  };

  const createProxy = async (
    client: { rpc: { BridgeService: BridgeService } },
    overrides?: Partial<TransportOptions>,
  ) => {
    const stream = (overrides?.stream as TestStream) ?? new TestStream();
    const options = createTransportOptions({ stream, ...overrides });
    const proxy = new RtcTransportProxy({ ...options, bridgeService: client.rpc.BridgeService });
    await proxy.open();
    afterTest(async () => await proxy.close());
    return { proxy, options, stream };
  };

  const createService = async (port: RpcPort) => {
    const rtcTransportService: BridgeService = new RtcTransportService();
    const service = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
      },
      handlers: { BridgeService: rtcTransportService },
      port,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true,
      },
    });
    await service.open();
    afterTest(() => service.close());
    return service;
  };

  const createClient = async (port: RpcPort) => {
    const rpcClient = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
      },
      port,
      noHandshake: true,
      encodingOptions: {
        preserveAny: true,
      },
    });
    await rpcClient.open();
    afterTest(() => rpcClient.close());
    return rpcClient;
  };

  const assertNoErrorsAfterTest = (args: { proxy: Transport }) => {
    afterTest(() => args.proxy.errors.assertNoUnhandledErrors());
  };
});

const createTransportOptions = (options: Partial<TransportOptions>): TransportOptions => {
  return {
    initiator: false,
    stream: new Duplex(),
    sendSignal: async () => {},
    remotePeerKey: PublicKey.random().toHex(),
    ownPeerKey: PublicKey.random().toHex(),
    topic: PublicKey.random().toHex(),
    ...options,
  };
};
