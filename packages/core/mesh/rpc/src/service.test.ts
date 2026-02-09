//
// Copyright 2021 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { latch, sleep } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { schema } from '@dxos/protocols/proto';
import {
  type TestRpcResponse,
  type TestService,
  type TestStreamService,
} from '@dxos/protocols/proto/example/testing/rpc';

import { type ProtoRpcPeer, createProtoRpcPeer, createServiceBundle } from './service';
import { createLinkedPorts, encodeMessage } from './testing';

// TODO(dmaretskyi): Rename alice and bob to peer1 and peer2.

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: 'responseData' };
          },
          voidCall: async () => {},
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    const response = await client.rpc.TestService.testCall({
      data: 'requestData',
    });

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService'),
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
          voidCall: async () => {},
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    let error!: Error;
    try {
      await client.rpc.TestService.testCall({ data: 'requestData' });
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
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            expect(req.data).toEqual('requestData');
            return { data: 'responseData' };
          },
          voidCall: async () => {},
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      port: bobPort,
    });

    await Promise.all([server.open(), client.open()]);

    await client.rpc.TestService.voidCall();
  });

  describe('streams', () => {
    let server: ProtoRpcPeer<{}>;
    let client: ProtoRpcPeer<{ TestStreamService: TestStreamService }>;

    beforeEach(async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createProtoRpcPeer({
        exposed: {
          TestStreamService: schema.getService('example.testing.rpc.TestStreamService'),
        },
        handlers: {
          TestStreamService: {
            testCall: (req) => {
              expect(req.data).toEqual('requestData');

              return new Stream(({ next, close }) => {
                next({ data: 'foo' });
                setTimeout(async () => {
                  next({ data: 'bar' });
                  await sleep(5);
                  next({ data: 'baz' });
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
          TestStreamService: schema.getService('example.testing.rpc.TestStreamService'),
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);
    });

    test('consumed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall({
        data: 'requestData',
      });

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { data: 'foo' } },
        { data: { data: 'bar' } },
        { data: { data: 'baz' } },
        { closed: true },
      ]);
    });

    test('subscribed stream', async () => {
      const stream = client.rpc.TestStreamService.testCall({
        data: 'requestData',
      });

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

      const TestService = schema.getService('example.testing.rpc.TestService');
      const PingService = schema.getService('example.testing.rpc.PingService');

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
              return { data: 'responseData' };
            },
            voidCall: async () => {},
          },
          PingService: {
            ping: async (req) => ({ nonce: req.nonce }),
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall({
        data: 'requestData',
      });
      expect(response.data).toEqual('responseData');

      const ping = await client.rpc.PingService.ping({ nonce: 5 });
      expect(ping.nonce).toEqual(5);
    });

    test('services exposed by both peers', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = createProtoRpcPeer({
        requested: {
          TestService: schema.getService('example.testing.rpc.TestService'),
        },
        exposed: {
          PingService: schema.getService('example.testing.rpc.PingService'),
        },
        handlers: {
          PingService: {
            ping: async (req) => ({ nonce: req.nonce }),
          },
        },
        port: alicePort,
      });

      const bob = createProtoRpcPeer({
        requested: {
          PingService: schema.getService('example.testing.rpc.PingService'),
        },
        exposed: {
          TestService: schema.getService('example.testing.rpc.TestService'),
        },
        handlers: {
          TestService: {
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return { data: 'responseData' };
            },
            voidCall: async () => {},
          },
        },
        port: bobPort,
      });

      await Promise.all([alice.open(), bob.open()]);

      const response = await alice.rpc.TestService.testCall({
        data: 'requestData',
      });
      expect(response.data).toEqual('responseData');

      const ping = await bob.rpc.PingService.ping({ nonce: 5 });
      expect(ping.nonce).toEqual(5);
    });
  });

  describe('service providers', () => {
    test('sync function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = schema.getService('example.testing.rpc.TestService');

      const services = createServiceBundle({
        TestService,
      });

      const server = createProtoRpcPeer({
        exposed: services,
        handlers: {
          TestService: () => ({
            testCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return { data: 'responseData' };
            },
            voidCall: async () => {},
          }),
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: services,
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestService.testCall({
        data: 'requestData',
      });
      expect(response.data).toEqual('responseData');
    });

    test('async function', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = schema.getService('example.testing.rpc.TestService');

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
                return { data: 'responseData' };
              },
              voidCall: async () => {},
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

      const response = await client.rpc.TestService.testCall({
        data: 'requestData',
      });
      expect(response.data).toEqual('responseData');
    });

    test('stream', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService: schema.getService('example.testing.rpc.TestStreamService'),
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

                  next({ data: 'foo' });
                  next({ data: 'bar' });
                  next({ data: 'baz' });
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

      const stream = await client.rpc.TestStreamService.testCall({
        data: 'requestData',
      });
      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { data: 'foo' } },
        { data: { data: 'bar' } },
        { data: { data: 'baz' } },
        { closed: true },
      ]);
    });

    test('stream that throws', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const services = createServiceBundle({
        TestStreamService: schema.getService('example.testing.rpc.TestStreamService'),
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

      const stream = await client.rpc.TestStreamService.testCall({
        data: 'requestData',
      });
      expect(await Stream.consume(stream)).toEqual([expect.objectContaining({ closed: true })]);
    });
  });

  describe('google.protobuf.Any encoding', () => {
    test('recursively encodes google.protobuf.Any by default', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        exposed: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService'),
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              expect(req.payload['@type']).toEqual('example.testing.rpc.PingRequest');
              expect(req.payload.nonce).toEqual(5);
              return {
                payload: {
                  '@type': 'example.testing.rpc.PingReponse',
                  nonce: 10,
                },
              };
            },
          },
        },
        port: alicePort,
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService'),
        },
        port: bobPort,
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestAnyService.testCall({
        payload: {
          '@type': 'example.testing.rpc.PingRequest',
          nonce: 5,
        },
      });

      expect(response.payload['@type']).toEqual('example.testing.rpc.PingReponse');
      expect(response.payload.nonce).toEqual(10);
    });

    test('any encoding can be disabled', async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        exposed: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService'),
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              expect(req.payload['@type']).toEqual('google.protobuf.Any');
              expect(req.payload.type_url).toEqual('example.testing.Example');
              expect(req.payload.value).toEqual(encodeMessage('hello'));
              return {
                payload: {
                  type_url: 'example.testing.Example',
                  value: encodeMessage('world'),
                },
              };
            },
          },
        },
        port: alicePort,
        encodingOptions: {
          preserveAny: true,
        },
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService'),
        },
        port: bobPort,
        encodingOptions: {
          preserveAny: true,
        },
      });

      await Promise.all([server.open(), client.open()]);

      const response = await client.rpc.TestAnyService.testCall({
        payload: {
          type_url: 'example.testing.Example',
          value: encodeMessage('hello'),
        },
      });

      expect(response.payload.type_url).toEqual('example.testing.Example');
      expect(response.payload.value).toEqual(encodeMessage('world'));
    });
  });

  test('timeouts on methods', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      handlers: {
        TestService: {
          testCall: async (req) => {
            await sleep(10);
            return { data: 'responseData' };
          },
          voidCall: async () => {},
        },
      },
      port: alicePort,
    });

    const client = createProtoRpcPeer({
      requested: {
        TestService: schema.getService('example.testing.rpc.TestService'),
      },
      port: bobPort,
      timeout: 10_000,
    });

    await Promise.all([server.open(), client.open()]);

    const promise = client.rpc.TestService.testCall(
      {
        data: 'requestData',
      },
      { timeout: 1 },
    );
    await expect(promise).rejects.toThrow(/Timeout/);
  });
});
