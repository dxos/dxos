//
// Copyright 2021 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { latch, sleep } from '@dxos/async';
import { EmptySchema, create } from '@dxos/protocols/buf';
import {
  MessageWithAnySchema,
  PingReponseSchema,
  PingRequestSchema,
  PingService,
  TestAnyService,
  TestRpcRequestSchema,
  type TestRpcResponse,
  TestRpcResponseSchema,
  TestService,
  TestStreamService,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { Stream } from '@dxos/stream';

import { type ProtoRpcPeer, createProtoRpcPeer, createServiceBundle } from './service';
import { createLinkedPorts, encodeMessage } from './testing';

// TODO(dmaretskyi): Rename alice and bob to peer1 and peer2.

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService,
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => {
            return create(EmptySchema);
          },
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService,
      },
      handlers: {
        TestService: {
          testCall: async (_req): Promise<TestRpcResponse> => {
            const handlerFn = async (): Promise<never> => {
              await sleep(5);
              throw new Error('TestError');
            };

            return await handlerFn();
          },
          voidCall: async () => {
            return create(EmptySchema);
          },
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    let error!: Error;
    try {
      await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
    } catch (err: any) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toEqual('TestError');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
    expect(error.stack?.includes('TestCall')).toEqual(true);
  });

  test('calls methods with google.protobuf.Empty parameters and return values', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService,
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => {
            return create(EmptySchema);
          },
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.voidCall(create(EmptySchema));
  });

  describe('streams', () => {
    let server: ProtoRpcPeer<{}>;
    let client: ProtoRpcPeer<{ TestStreamService: typeof TestStreamService }>;

    beforeEach(async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createProtoRpcPeer({
        exposed: {
          TestStreamService,
        },
        handlers: {
          TestStreamService: {
            testCall: (req) => {
              expect(req.data).toEqual('requestData');

              return new Stream(({ next, close }) => {
                next(create(TestRpcResponseSchema, { data: 'foo' }));
                setTimeout(async () => {
                  next(create(TestRpcResponseSchema, { data: 'bar' }));
                  await sleep(5);
                  next(create(TestRpcResponseSchema, { data: 'baz' }));
                  close();
                });
              });
            },
          },
        },
        port: alicePort,
      });

      client = createProtoRpcPeer({
        requested: {
          TestStreamService,
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);
    });

    test('consumed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'foo' } },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'bar' } },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'baz' } },
        { closed: true },
      ]);
    });

    test('subscribed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));

      let lastData: string | undefined;
      const [closed, close] = latch();
      stream.subscribe((msg) => {
        lastData = msg.data;
      }, close);

      await closed();

      expect(lastData).toEqual('baz');
    });
  });

  describe('multiple services', () => {
    test('call different services', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestService,
        PingService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return create(TestRpcResponseSchema, { data: 'responseData' });
            },
            voidCall: async () => {
              return create(EmptySchema);
            },
          },
          PingService: {
            ping: async (req) => create(PingReponseSchema, { nonce: req.nonce }),
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');

      const ping = await client.rpc.PingService.ping(create(PingRequestSchema, { nonce: 5 }));
      expect(ping.nonce).toEqual(5);
    });

    test('services exposed by both peers', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = createProtoRpcPeer({
        requested: {
          TestService,
        },
        exposed: {
          PingService,
        },
        handlers: {
          PingService: {
            ping: async (req) => create(PingReponseSchema, { nonce: req.nonce }),
          },
        },
        port: alicePort,
      });

      const bob = createProtoRpcPeer({
        requested: {
          PingService,
        },
        exposed: {
          TestService,
        },
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return create(TestRpcResponseSchema, { data: 'responseData' });
            },
            voidCall: async () => {
              return create(EmptySchema);
            },
          },
        },
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const response = await alice.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');

      const ping = await bob.rpc.PingService.ping(create(PingRequestSchema, { nonce: 5 }));
      expect(ping.nonce).toEqual(5);
    });
  });

  describe('service providers', () => {
    test('sync function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestService: () => ({
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return create(TestRpcResponseSchema, { data: 'responseData' });
            },
            voidCall: async () => {
              return create(EmptySchema);
            },
          }),
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');
    });

    test('async function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestService: async () => {
            await sleep(1);
            return {
              testCall: async (req) => {
                expect(req.data).toEqual('requestData');
                return create(TestRpcResponseSchema, { data: 'responseData' });
              },
              voidCall: async () => {
                return create(EmptySchema);
              },
            };
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');
    });

    test('stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestStreamService: async () => {
            await sleep(1);
            return {
              testCall: (req) =>
                new Stream(({ next, close }) => {
                  expect(req.data).toEqual('requestData');

                  next(create(TestRpcResponseSchema, { data: 'foo' }));
                  next(create(TestRpcResponseSchema, { data: 'bar' }));
                  next(create(TestRpcResponseSchema, { data: 'baz' }));
                  close();
                }),
            };
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'foo' } },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'bar' } },
        { data: { $typeName: 'example.testing.rpc.TestRpcResponse', data: 'baz' } },
        { closed: true },
      ]);
    });

    test('stream that throws', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestStreamService: async () => {
            throw new Error('test error');
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(await Stream.consume(stream)).toEqual([expect.objectContaining({ closed: true })]);
    });
  });

  describe('google.protobuf.Any encoding', () => {
    test('recursively encodes google.protobuf.Any by default', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        exposed: {
          TestAnyService,
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              return create(MessageWithAnySchema, { payload: req.payload });
            },
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService,
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestAnyService.testCall({
        payload: {
          typeUrl: 'example.testing.rpc.PingRequest',
          value: encodeMessage('hello'),
        },
      });

      expect(response.payload?.typeUrl).toEqual('example.testing.rpc.PingRequest');
      expect(response.payload?.value).toEqual(encodeMessage('hello'));
    });
  });

  test('timeouts on methods', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService,
      },
      handlers: {
        TestService: {
          testCall: async (_req) => {
            await sleep(10);
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => {
            return create(EmptySchema);
          },
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
      timeout: 10_000,
    });

    await Promise.all([server.open(), client.open()]);

    const promise = client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }), {
      timeout: 1,
    });
    await expect(promise).rejects.toThrow(/Timeout/);
  });
});
