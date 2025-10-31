//
// Copyright 2020 DXOS.org
//

import { Duplex } from 'stream';

import { describe, expect, onTestFinished, test } from 'vitest';

import { Event as AsyncEvent, TestStream, Trigger, sleep } from '@dxos/async';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type RpcPort, createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from '../transport';

import { RtcTransportProxy } from './rtc-transport-proxy';
import { RtcTransportService } from './rtc-transport-service';
import { handleChannelErrors } from './test-utils';

// Segfault in node-datachannel.
describe.skip('RtcPeerTransportProxy', () => {
  test('open and close', async () => {
    const { proxy } = await setupProxy();
    await proxy.open();
    const wait = proxy.closed.waitForCount(1);
    expect(proxy.isOpen).toBeTruthy();
    await proxy.close();
    await wait;
  });

  test('transport open failure closes proxy', async () => {
    const mockTransport = createMockTransport({
      open: async () => {
        await sleep(20);
        throw new Error();
      },
    });
    const peer = await setupProxy({}, mockTransport.factory);
    const errors = handleChannelErrors(peer.proxy);
    await peer.proxy.open();
    await sleep(20);
    expect(peer.proxy.isOpen).toBeFalsy();
    await errors.expectErrorRaised();
  });

  test('transport error before connected closes proxy', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    const errors = handleChannelErrors(peer.proxy);
    await peer.proxy.open();
    mockTransport.transport.errors.raise(new Error());
    await sleep(20);
    expect(peer.proxy.isOpen).toBeFalsy();
    await errors.expectErrorRaised();
  });

  test('transport close closes proxy', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    expect(peer.proxy.isOpen).toBeTruthy();
    await connectAndWaitProxy(peer, mockTransport);
    await closeAndWaitProxy(peer, mockTransport);
    expect(peer.proxy.isOpen).toBeFalsy();
  });

  test('transport connected after proxy is closed is ignored', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    expect(peer.proxy.isOpen).toBeTruthy();
    await peer.proxy.close();

    let connected = false;
    peer.proxy.connected.on(() => {
      connected = true;
    });
    mockTransport.transport.connected.emit();
    await sleep(20);

    expect(connected).toBeFalsy();
    peer.proxy.errors.assertNoUnhandledErrors();
  });

  test('transport error after connection passed to proxy raises an error', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    const errors = handleChannelErrors(peer.proxy);
    await peer.proxy.open();
    await connectAndWaitProxy(peer, mockTransport);
    mockTransport.transport.errors.raise(new Error());
    await sleep(20);
    expect(peer.proxy.isOpen).toBeFalsy();
    await errors.expectErrorRaised();
  });

  test('transport error raised after close is ignored', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    await connectAndWaitProxy(peer, mockTransport);
    await sleep(20);
    await closeAndWaitProxy(peer, mockTransport);
    mockTransport.transport.errors.raise(new Error());
    await sleep(20);
    expect(peer.proxy.isOpen).toBeFalsy();
    peer.proxy.errors.assertNoUnhandledErrors();
  });

  test('ice candidate signal failure tolerated', async () => {
    const mockTransport = createMockTransport();
    const failed = new Trigger();
    const peer = await setupProxy(
      {
        sendSignal: () => {
          failed.wake();
          throw new Error();
        },
      },
      mockTransport.factory,
    );
    await peer.proxy.open();
    await connectAndWaitProxy(peer, mockTransport);
    await mockTransport.sendSignalFromTransport({ payload: { data: { type: 'candidate' } } });
    await failed.wait();

    await sleep(20);
    expect(peer.proxy.isOpen).toBeTruthy();
    peer.proxy.errors.assertNoUnhandledErrors();
  });

  test('error raised when fails to send an offer/answer', async () => {
    for (const type of ['offer', 'answer']) {
      const mockTransport = createMockTransport();
      const failed = new Trigger();
      const peer = await setupProxy(
        {
          sendSignal: () => {
            failed.wake();
            throw new Error();
          },
        },
        mockTransport.factory,
      );
      await peer.proxy.open();
      const errors = handleChannelErrors(peer.proxy);
      await connectAndWaitProxy(peer, mockTransport);
      await mockTransport.sendSignalFromTransport({ payload: { data: { type } } });
      await failed.wait();

      await sleep(20);
      await errors.expectErrorRaised();
    }
  });

  test('error raised when transport fails to handle a signal', async () => {
    const failed = new Trigger();
    const mockTransport = createMockTransport({
      onSignal: async (): Promise<void> => {
        await sleep(20);
        failed.wake();
        throw new Error();
      },
    });
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    const errors = handleChannelErrors(peer.proxy);
    await connectAndWaitProxy(peer, mockTransport);
    await peer.proxy.onSignal({ payload: { data: { type: 'offer' } } });
    await failed.wait();

    await sleep(20);
    await errors.expectErrorRaised();
  });

  test('transport close error tolerated', async () => {
    const failed = new Trigger();
    const mockTransport = createMockTransport({
      close: async () => {
        await sleep(20);
        failed.wake();
        throw new Error();
      },
    });
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    await connectAndWaitProxy(peer, mockTransport);
    await sleep(20);
    await peer.proxy.close();
    await failed.wait();

    peer.proxy.errors.assertNoUnhandledErrors();
  });

  test('transport data push after proxy close is ignored', async () => {
    const mockTransport = createMockTransport();
    const peer = await setupProxy({}, mockTransport.factory);
    await peer.proxy.open();
    const messageParts = [Buffer.from('hello,'), Buffer.from('world!')];
    await connectAndWaitProxy(peer, mockTransport);
    mockTransport.stream.push(messageParts[0]);
    mockTransport.stream.push(messageParts[1]);
    await sleep(20);
    await peer.stream.assertReceivedAsync(Buffer.concat(messageParts));
    await peer.proxy.close();
    await sleep(20);
    mockTransport.stream.push(Buffer.from('!!!'));
    await sleep(20);

    await peer.stream.assertReceivedAsync(Buffer.concat(messageParts));
    peer.proxy.errors.assertNoUnhandledErrors();
  });

  describe('RtcPeerConnection', () => {
    test('establish connection and send data through with protocol', async () => {
      const peer1 = await setupProxy({
        sendSignal: async (signal) => {
          await peer2.proxy.onSignal(signal);
        },
      });
      await peer1.proxy.open();
      assertNoErrorsAfterTest(peer1);

      const peer2 = await setupProxy({
        ownPeerKey: peer1.options.remotePeerKey,
        remotePeerKey: peer1.options.ownPeerKey,
        topic: peer1.options.topic,
        sendSignal: async (signal) => {
          await peer1.proxy.onSignal(signal);
        },
      });
      await peer2.proxy.open();
      assertNoErrorsAfterTest(peer2);

      await TestStream.assertConnectivity(peer1.stream, peer2.stream, { timeout: 1500 });
    });

    test('establish connection and send data through with protocol with multiplexing', async () => {
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

  const setupProxy = async (overrides?: Partial<TransportOptions>, transportFactory?: TransportFactory) => {
    const [port1, port2] = createLinkedPorts();
    const service = await createService(port1, transportFactory);
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
    onTestFinished(async () => {
      await proxy.close();
    });
    return { proxy, options, stream };
  };

  const createService = async (port: RpcPort, transportFactory?: TransportFactory) => {
    const rtcTransportService = new RtcTransportService(undefined, undefined, transportFactory);
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
    onTestFinished(async () => {
      expect(rtcTransportService.hasOpenTransports()).toBeFalsy();
      await service.close();
    });
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
    onTestFinished(async () => {
      await rpcClient.close();
    });
    return rpcClient;
  };

  const assertNoErrorsAfterTest = (args: { proxy: Transport }) => {
    onTestFinished(() => {
      args.proxy.errors.assertNoUnhandledErrors();
    });
  };

  const closeAndWaitProxy = (peer: { proxy: RtcTransportProxy }, mockTransport: { transport: MockTransport }) => {
    const waitForConnected = peer.proxy.closed.waitForCount(1);
    mockTransport.transport.closed.emit();
    return waitForConnected;
  };

  const connectAndWaitProxy = (peer: { proxy: RtcTransportProxy }, mockTransport: { transport: MockTransport }) => {
    const waitForConnected = peer.proxy.connected.waitForCount(1);
    mockTransport.transport.connected.emit();
    return waitForConnected;
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

const createMockTransport = (delegate?: Partial<Transport>) => {
  const transport = new MockTransport(delegate);
  const receivedMessages: string[] = [];
  const stream = new Duplex({
    read: () => {},
    write: (chunk: any, _: BufferEncoding, callback: () => void) => {
      receivedMessages.push(Buffer.from(chunk).toString());
      callback();
    },
  });
  let sendSignal: any | undefined;
  return {
    receivedMessages,
    transport,
    stream,
    sendSignalFromTransport: async (signal: any) => {
      sendSignal(signal);
    },
    factory: {
      createTransport: (options: TransportOptions): Transport => {
        sendSignal = options.sendSignal;
        stream.pipe(options.stream).pipe(stream);
        return transport;
      },
    },
  };
};

class MockTransport implements Transport {
  public readonly closed = new AsyncEvent();
  public readonly connected = new AsyncEvent();
  public readonly errors = new ErrorStream();

  constructor(private readonly _delegate: Partial<Transport> = {}) {}

  public async open(): Promise<this> {
    await this._delegate.open?.();
    return this;
  }

  public async close(): Promise<this> {
    await this._delegate.close?.();
    return this;
  }

  public async onSignal(signal: any): Promise<void> {
    return this._delegate.onSignal?.(signal);
  }

  public async getStats(): Promise<TransportStats> {
    return {} as any;
  }

  public async getDetails(): Promise<string> {
    return '';
  }
}
