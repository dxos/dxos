//
// Copyright 2021 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';
import { describe, expect, test } from 'vitest';

import { latch, sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import {
  PingReponseSchema,
  PingRequestSchema,
  PingService,
  TestRpcRequestSchema,
  type TestRpcResponse,
  TestRpcResponseSchema,
  TestService,
  TestStreamService,
} from '@dxos/protocols/buf/example/testing/rpc_pb';

import { type BufProtoRpcPeer, createBufProtoRpcPeer, createBufServiceBundle } from './service-buf';
import { createLinkedPorts } from './testing';

describe('Buf protobuf service', () => {
  test('works with buf protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createBufProtoRpcPeer({
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

    const client = createBufProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));

    expect(response.data).toEqual('responseData');
  });

  test('errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createBufProtoRpcPeer({
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

    const client = createBufProtoRpcPeer({
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

    const server = createBufProtoRpcPeer({
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

    const client = createBufProtoRpcPeer({
      requested: {
        TestService,
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.voidCall(create(EmptySchema));
  });

  describe('streams', () => {
    let server: BufProtoRpcPeer<{}>;
    let client: BufProtoRpcPeer<{ TestStreamService: typeof TestStreamService }>;

    test('consumed stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createBufProtoRpcPeer({
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

      client = createBufProtoRpcPeer({
        requested: {
          TestStreamService,
        },
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

    test('subscribed stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createBufProtoRpcPeer({
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

      client = createBufProtoRpcPeer({
        requested: {
          TestStreamService,
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

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

      const services = createBufServiceBundle({
        TestService,
        PingService,
      });

      const server = createBufProtoRpcPeer({
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

      const client = createBufProtoRpcPeer({
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

      const alice = createBufProtoRpcPeer({
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

      const bob = createBufProtoRpcPeer({
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

      const services = createBufServiceBundle({
        TestService,
      });

      const server = createBufProtoRpcPeer({
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

      const client = createBufProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');
    });

    test('async function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createBufServiceBundle({
        TestService,
      });

      const server = createBufProtoRpcPeer({
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

      const client = createBufProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(response.data).toEqual('responseData');
    });

    test('stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createBufServiceBundle({
        TestStreamService,
      });

      const server = createBufProtoRpcPeer({
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

      const client = createBufProtoRpcPeer({
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

      const services = createBufServiceBundle({
        TestStreamService,
      });

      const server = createBufProtoRpcPeer({
        exposed: services,
        handlers: {
          TestStreamService: async () => {
            throw new Error('test error');
          },
        },
        port: alicePort,
      });

      const client = createBufProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));
      expect(await Stream.consume(stream)).toEqual([expect.objectContaining({ closed: true })]);
    });
  });

  test('timeouts on methods', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createBufProtoRpcPeer({
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

    const client = createBufProtoRpcPeer({
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
