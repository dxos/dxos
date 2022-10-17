//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';

import { sleep, latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { schema } from '@dxos/protocols';
import { TestStreamService, TestRpcResponse } from '@dxos/protocols/proto/example/testing/rpc';

import { SerializedRpcError } from './errors';
import { createProtoRpcPeer, ProtoRpcPeer, createServiceBundle } from './service';
import { createLinkedPorts } from './testutil';

describe('Protobuf service', function () {
  it('Works with protobuf service', async function () {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService')
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
        TestService: schema.getService('example.testing.rpc.TestService')
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

  it('Errors are serialized', async function () {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService')
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
        TestService: schema.getService('example.testing.rpc.TestService')
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

  it('calls methods with google.protobuf.Empty parameters and return values', async function () {
    const [alicePort, bobPort] = createLinkedPorts();

    const server = createProtoRpcPeer({
      requested: {},
      exposed: {
        TestService: schema.getService('example.testing.rpc.TestService')
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
        TestService: schema.getService('example.testing.rpc.TestService')
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

  describe('streams', function () {
    let server: ProtoRpcPeer<{}>;
    let client: ProtoRpcPeer<{ TestStreamService: TestStreamService }>;

    beforeEach(async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createProtoRpcPeer({
        requested: {},
        exposed: {
          TestStreamService: schema.getService('example.testing.rpc.TestStreamService')
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
            }
          }
        },
        port: alicePort
      });

      client = createProtoRpcPeer({
        requested: {
          TestStreamService: schema.getService('example.testing.rpc.TestStreamService')
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

    it('consumed stream', async function () {
      const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });

      expect(await Stream.consume(stream)).toEqual([
        { ready: true },
        { data: { data: 'foo' } },
        { data: { data: 'bar' } },
        { data: { data: 'baz' } },
        { closed: true }
      ]);
    });

    it('subscribed stream', async function () {
      const stream = client.rpc.TestStreamService.testCall({ data: 'requestData' });

      let lastData: string | undefined;
      const [closed, close] = latch();
      stream.subscribe(msg => {
        lastData = msg.data;
      }, close);

      await closed();

      expect(lastData).toEqual('baz');
    });
  });

  describe('multiple services', function () {
    it('call different services', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const TestService = schema.getService('example.testing.rpc.TestService');
      const PingService = schema.getService('example.testing.rpc.PingService');

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

    it('services exposed by both peers', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const alice = createProtoRpcPeer({
        requested: {
          TestService: schema.getService('example.testing.rpc.TestService')
        },
        exposed: {
          PingService: schema.getService('example.testing.rpc.PingService')
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
          PingService: schema.getService('example.testing.rpc.PingService')
        },
        exposed: {
          TestService: schema.getService('example.testing.rpc.TestService')
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

  describe('google.protobuf.Any encoding', function () {
    it('recursively encodes google.protobuf.Any by default', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        requested: {},
        exposed: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService')
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              expect(req.payload['@type']).toEqual('example.testing.rpc.PingRequest');
              expect(req.payload.nonce).toEqual(5);
              return {
                payload: {
                  '@type': 'example.testing.rpc.PingReponse',
                  nonce: 10
                }
              };
            }
          }
        },
        port: alicePort
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService')
        },
        exposed: {},
        handlers: {},
        port: bobPort
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);

      const response = await client.rpc.TestAnyService.testCall({
        payload: {
          '@type': 'example.testing.rpc.PingRequest',
          nonce: 5
        }
      });

      expect(response.payload['@type']).toEqual('example.testing.rpc.PingReponse');
      expect(response.payload.nonce).toEqual(10);
    });

    it('any encoding can be disabled', async function () {
      const [alicePort, bobPort] = createLinkedPorts();

      const server = createProtoRpcPeer({
        requested: {},
        exposed: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService')
        },
        handlers: {
          TestAnyService: {
            testCall: async (req) => {
              expect(req.payload['@type']).toEqual('google.protobuf.Any');
              expect(req.payload.type_url).toEqual('example.testing.Example');
              expect(req.payload.value).toEqual(Buffer.from('hello'));
              return {
                payload: {
                  type_url: 'example.testing.Example',
                  value: Buffer.from('world')
                }
              };
            }
          }
        },
        port: alicePort,
        encodingOptions: {
          preserveAny: true
        }
      });

      const client = createProtoRpcPeer({
        requested: {
          TestAnyService: schema.getService('example.testing.rpc.TestAnyService')
        },
        exposed: {},
        handlers: {},
        port: bobPort,
        encodingOptions: {
          preserveAny: true
        }
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);

      const response = await client.rpc.TestAnyService.testCall({
        payload: {
          type_url: 'example.testing.Example',
          value: Buffer.from('hello')
        }
      });

      expect(response.payload.type_url).toEqual('example.testing.Example');
      expect(response.payload.value).toEqual(Buffer.from('world'));
    });
  });
});
