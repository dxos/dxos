//
// Copyright 2021 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { anyUnpack } from '@bufbuild/protobuf/wkt';
import { AnySchema, EmptySchema } from '@bufbuild/protobuf/wkt';
import { beforeEach, describe, expect, test } from 'vitest';

import { latch, sleep } from '@dxos/async';
import { Stream } from '@dxos/async';
import { Context, TRACE_SPAN_ATTRIBUTE } from '@dxos/context';
import { anyPackPrefixed } from '@dxos/protocols/buf';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  MessageWithAnySchema,
  type PingReponse,
  PingReponseSchema,
  type PingRequest,
  PingRequestSchema,
  PingService as PingServiceDesc,
  TestAnyService as TestAnyServiceDesc,
  TestRpcRequestSchema,
  type TestRpcResponse,
  TestRpcResponseSchema,
  TestService as TestServiceDesc,
  TestStreamService as TestStreamServiceDesc,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { type RequestOptions } from '@dxos/protocols/service-contract';

import { type ProtoRpcPeer, createProtoRpcPeer, createServiceBundle } from './service.ts';
import { createLinkedPorts, encodeMessage } from './testing.ts';

type TestService = BufService<typeof TestServiceDesc>;
type TestStreamService = BufService<typeof TestStreamServiceDesc>;
type TestAnyService = BufService<typeof TestAnyServiceDesc>;
type PingService = BufService<typeof PingServiceDesc>;

// TODO(dmaretskyi): Rename alice and bob to peer1 and peer2.

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall(
      create(TestRpcRequestSchema, {
        data: 'requestData',
      }),
    );

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
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
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
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
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.voidCall(create(EmptySchema, {}));
  });

  describe('streams', () => {
    let server: ProtoRpcPeer<{}>;
    let client: ProtoRpcPeer<{ TestStreamService: TestStreamService }>;

    beforeEach(async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createProtoRpcPeer({
        exposed: {
          TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
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
          TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);
    });

    test('consumed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: create(TestRpcResponseSchema, { data: 'foo' }) },
        { data: create(TestRpcResponseSchema, { data: 'bar' }) },
        { data: create(TestRpcResponseSchema, { data: 'baz' }) },
        { closed: true },
      ]);
    });

    test('subscribed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );

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

      const TestService = getBufService<TestService>('example.testing.rpc.TestService');
      const PingService = getBufService<PingService>('example.testing.rpc.PingService');

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
            voidCall: async () => create(EmptySchema, {}),
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

      const response = await client.rpc.TestService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(response.data).toEqual('responseData');

      const ping = await client.rpc.PingService.ping(create(PingRequestSchema, { nonce: 5 }));
      expect(ping.nonce).toEqual(5);
    });

    test('services exposed by both peers', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = createProtoRpcPeer({
        requested: {
          TestService: getBufService<TestService>('example.testing.rpc.TestService'),
        },
        exposed: {
          PingService: getBufService<PingService>('example.testing.rpc.PingService'),
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
          PingService: getBufService<PingService>('example.testing.rpc.PingService'),
        },
        exposed: {
          TestService: getBufService<TestService>('example.testing.rpc.TestService'),
        },
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return create(TestRpcResponseSchema, { data: 'responseData' });
            },
            voidCall: async () => create(EmptySchema, {}),
          },
        },
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const response = await alice.rpc.TestService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(response.data).toEqual('responseData');

      const ping = await bob.rpc.PingService.ping(create(PingRequestSchema, { nonce: 5 }));
      expect(ping.nonce).toEqual(5);
    });
  });

  describe('service providers', () => {
    test('sync function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = getBufService<TestService>('example.testing.rpc.TestService');

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
            voidCall: async () => create(EmptySchema, {}),
          }),
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(response.data).toEqual('responseData');
    });

    test('async function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = getBufService<TestService>('example.testing.rpc.TestService');

      const services = createServiceBundle({
        TestService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestService: async (): Promise<TestService> => {
            await sleep(1);
            return {
              testCall: async (req) => {
                expect(req.data).toEqual('requestData');
                return create(TestRpcResponseSchema, { data: 'responseData' });
              },
              voidCall: async () => create(EmptySchema, {}),
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

      const response = await client.rpc.TestService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(response.data).toEqual('responseData');
    });

    test('stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestStreamService: async (): Promise<TestStreamService> => {
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

      const stream = await client.rpc.TestStreamService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: create(TestRpcResponseSchema, { data: 'foo' }) },
        { data: create(TestRpcResponseSchema, { data: 'bar' }) },
        { data: create(TestRpcResponseSchema, { data: 'baz' }) },
        { closed: true },
      ]);
    });

    test('stream that throws', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestStreamService: async (): Promise<TestStreamService> => {
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

      const stream = await client.rpc.TestStreamService.testCall(
        create(TestRpcRequestSchema, {
          data: 'requestData',
        }),
      );
      expect(await Stream.consume(stream)).toEqual([expect.objectContaining({ closed: true })]);
    });
  });

  describe('google.protobuf.Any encoding', () => {
    test('recursively encodes google.protobuf.Any by default', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        exposed: {
          TestAnyService: getBufService<TestAnyService>('example.testing.rpc.TestAnyService'),
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              const request = req.payload && anyUnpack(req.payload, bufRegistry);
              expect(request?.$typeName).toEqual('example.testing.rpc.PingRequest');
              expect((request as PingRequest | undefined)?.nonce).toEqual(5);
              return create(MessageWithAnySchema, {
                payload: anyPackPrefixed(PingReponseSchema, create(PingReponseSchema, { nonce: 10 })),
              });
            },
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: getBufService<TestAnyService>('example.testing.rpc.TestAnyService'),
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestAnyService.testCall(
        create(MessageWithAnySchema, {
          payload: anyPackPrefixed(PingRequestSchema, create(PingRequestSchema, { nonce: 5 })),
        }),
      );

      const unpacked = response.payload && anyUnpack(response.payload, bufRegistry);
      expect(unpacked?.$typeName).toEqual('example.testing.rpc.PingReponse');
      expect((unpacked as PingReponse | undefined)?.nonce).toEqual(10);
    });

    test('any encoding can be disabled', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        exposed: {
          TestAnyService: getBufService<TestAnyService>('example.testing.rpc.TestAnyService'),
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              expect(req.payload?.typeUrl).toEqual('example.testing.Example');
              expect(req.payload?.value).toEqual(encodeMessage('hello'));
              return create(MessageWithAnySchema, {
                payload: create(AnySchema, {
                  typeUrl: 'example.testing.Example',
                  value: encodeMessage('world'),
                }),
              });
            },
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: getBufService<TestAnyService>('example.testing.rpc.TestAnyService'),
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestAnyService.testCall(
        create(MessageWithAnySchema, {
          payload: create(AnySchema, {
            typeUrl: 'example.testing.Example',
            value: encodeMessage('hello'),
          }),
        }),
      );

      expect(response.payload?.typeUrl).toEqual('example.testing.Example');
      expect(response.payload?.value).toEqual(encodeMessage('world'));
    });
  });

  test('timeouts on methods', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            await sleep(10);
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      port: bobPort,
      timeout: 10_000,
    });

    await Promise.all([server.open(), client.open()]);

    const promise = client.rpc.TestService.testCall(
      create(TestRpcRequestSchema, {
        data: 'requestData',
      }),
      { timeout: 1 },
    );
    await expect(promise).rejects.toThrow(/Timeout/);
  });

  test('W3C trace context propagates to handler options', async ({ expect }) => {
    const traceContext = {
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      tracestate: 'vendorkey=vendorvalue',
    };

    const [alicePort, bobPort] = createLinkedPorts();
    let receivedCtx: Context | undefined;

    const server = createProtoRpcPeer({
      exposed: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req: any, options?: RequestOptions) => {
            receivedCtx = options?.ctx;
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const callerCtx = new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: traceContext } });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }), { ctx: callerCtx });

    expect(receivedCtx).toBeInstanceOf(Context);
    const received = receivedCtx!.getAttribute(TRACE_SPAN_ATTRIBUTE);
    expect(received.traceparent).toEqual(traceContext.traceparent);
    expect(received.tracestate).toEqual(traceContext.tracestate);
  });

  test('handler receives no ctx when caller sends no trace context', async ({ expect }) => {
    const [alicePort, bobPort] = createLinkedPorts();
    let receivedOptions: RequestOptions | undefined;

    const server = createProtoRpcPeer({
      exposed: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req: any, options?: RequestOptions) => {
            receivedOptions = options;
            return create(TestRpcResponseSchema, { data: 'responseData' });
          },
          voidCall: async () => create(EmptySchema, {}),
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: getBufService<TestService>('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }));

    expect(receivedOptions).toBeUndefined();
  });

  test('W3C trace context propagates on streaming RPC', async ({ expect }) => {
    const traceContext = {
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    };

    const [alicePort, bobPort] = createLinkedPorts();
    let receivedCtx: Context | undefined;

    const server = createProtoRpcPeer({
      exposed: {
        TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
      },
      handlers: {
        TestStreamService: {
          testCall: (_req: any, options?: RequestOptions) => {
            receivedCtx = options?.ctx;
            return new Stream<TestRpcResponse>(({ next, close }) => {
              next(create(TestRpcResponseSchema, { data: 'streamData' }));
              close();
            });
          },
        },
      },
      port: alicePort,
    });

    const callerCtx = new Context({ attributes: { [TRACE_SPAN_ATTRIBUTE]: traceContext } });

    const client = createProtoRpcPeer({
      requested: {
        TestStreamService: getBufService<TestStreamService>('example.testing.rpc.TestStreamService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    const stream = client.rpc.TestStreamService.testCall(create(TestRpcRequestSchema, { data: 'requestData' }), {
      ctx: callerCtx,
    });
    await Stream.consumeData(stream);

    expect(receivedCtx).toBeInstanceOf(Context);
    const received = receivedCtx!.getAttribute(TRACE_SPAN_ATTRIBUTE);
    expect(received.traceparent).toEqual(traceContext.traceparent);
  });
});
