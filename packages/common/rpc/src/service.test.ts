//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { sleep, latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols';
import { TestStreamService, TestRpcResponse } from '@dxos/protocols/proto/dxos/testing/rpc';

import { SerializedRpcError } from './errors';
import { createProtoRpcPeer, ProtoRpcPeer, createServiceBundle } from './service';
import { createLinkedPorts } from './testutil';

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: 'responseData' };
          },
          voidCall: async () => { }
        }
      },
      port: alicePort
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      exposed: {},
      handlers: {},
      port: bobPort
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    const response = await client.rpc.TestService.testCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      handlers: {
        TestService: {
          testCall: async (req): Promise<TestRpcResponse> => {
            const handlerFn = async (): Promise<never> => {
              await sleep(5);
              throw new Error('TestError');
            };

            return await handlerFn();
          },
          voidCall: async () => { }
        }
      },
      port: alicePort
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      exposed: {},
      handlers: {},
      port: bobPort
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    let error!: Error;
    try {
      await client.rpc.TestService.testCall({ data: 'requestData' });
    } catch (err: any) {
      error = err;
    }

    expect(error).toBeA(SerializedRpcError);
    expect(error.message).toEqual('TestError');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
    expect(error.stack?.includes('TestCall')).toEqual(true);
  });

  test('calls methods with google.protobuf.Empty parameters and return values', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: 'responseData' };
          },
          voidCall: async () => { }
        }
      },
      port: alicePort
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('dxos.testing.rpc.TestService')
      },
      exposed: {},
      handlers: {},
      port: bobPort
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    await client.rpc.TestService.voidCall();
  });

  describe('streams', () => {
    let server: ProtoRpcPeer<{}>;
    let client: ProtoRpcPeer<{ TestStreamService: TestStreamService }>;

    beforeEach(async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createProtoRpcPeer({
        requested: {},
        exposed: {
          TestStreamService: schema.getService('dxos.testing.rpc.TestStreamService')
        },
        handlers: {
          TestStreamService: {
            testCall: (req) => {
              expect(req.data).toEqual('requestData');

              return new Stream(({ next, close }) => {
                next({ data: 'foo' });
                setImmediate(async () => {
                  next({ data: 'bar' });
                  await sleep(5);
                  next({ data: 'baz' });
                  close();
                });
              });
            }
          }
        },
        port: alicePort
      });

      client = createProtoRpcPeer({
        requested: {
          TestStreamService: schema.getService('dxos.testing.rpc.TestStreamService')
        },
        exposed: {},
        handlers: {},
        port: bobPort
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);
    });

    test('consumed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { data: 'foo' } },
        { data: { data: 'bar' } },
        { data: { data: 'baz' } },
        { closed: true }
      ]);
    });

    test('subscribed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });

      let lastData: string | undefined;
      const [closedPromise, closedLatch] = latch();
      stream.subscribe(msg => {
        lastData = msg.data;
      }, closedLatch);
      await closedPromise;

      expect(lastData).toEqual('baz');
    });
  });

  describe('multiple services', () => {
    it('call different services', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = schema.getService('dxos.testing.rpc.TestService');
      const PingService = schema.getService('dxos.testing.rpc.PingService');

      const services = createServiceBundle({
        TestService,
        PingService
      });

      const server = createProtoRpcPeer({
        requested: {},
        exposed: services,
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return { data: 'responseData' };
            },
            voidCall: async () => { }
          },
          PingService: {
            ping: async (req) => ({ nonce: req.nonce })
          }
        },
        port: alicePort
      });

      const client = createProtoRpcPeer({
        requested: services,
        exposed: {},
        handlers: {},
        port: bobPort
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);

      const response = await client.rpc.TestService.testCall({ data: 'requestData' });
      expect(response.data).toEqual('responseData');

      const ping = await client.rpc.PingService.ping({ nonce: 5 });
      expect(ping.nonce).toEqual(5);
    });

    it('services exposed by both peers', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = createProtoRpcPeer({
        requested: {
          TestService: schema.getService('dxos.testing.rpc.TestService')
        },
        exposed: {
          PingService: schema.getService('dxos.testing.rpc.PingService')
        },
        handlers: {
          PingService: {
            ping: async (req) => ({ nonce: req.nonce })
          }
        },
        port: alicePort
      });

      const bob = createProtoRpcPeer({
        requested: {
          PingService: schema.getService('dxos.testing.rpc.PingService')
        },
        exposed: {
          TestService: schema.getService('dxos.testing.rpc.TestService')
        },
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return { data: 'responseData' };
            },
            voidCall: async () => { }
          }
        },
        port: bobPort
      });

      await Promise.all([
        alice.open(),
        bob.open()
      ]);

      const response = await alice.rpc.TestService.testCall({ data: 'requestData' });
      expect(response.data).toEqual('responseData');

      const ping = await bob.rpc.PingService.ping({ nonce: 5 });
      expect(ping.nonce).toEqual(5);
    });
  });
});
