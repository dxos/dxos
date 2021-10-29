//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { sleep, latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';

import { createMultiRpcClient, createBundledRpcServer, createServiceBundle } from '.';
import { SerializedRpcError } from './errors';
import { schema } from './proto/gen';
import { TestStreamService } from './proto/gen/dxos/rpc/test';
import { RpcPeer } from './rpc';
import { createRpcClient, createRpcServer, ProtoRpcClient } from './service';
import { createLinkedPorts } from './testutil';

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const service = schema.getService('dxos.rpc.test.TestService');

    const server: RpcPeer = createRpcServer({
      service,
      handlers: {
        TestCall: async (req) => {
          expect(req.data).toEqual('requestData');
          return { data: 'responseData' };
        }
      },
      port: alicePort
    });

    const client = createRpcClient(service, {
      port: bobPort
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    const response = await client.rpc.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const [alicePort, bobPort] = createLinkedPorts();

    const service = schema.getService('dxos.rpc.test.TestService');

    const server: RpcPeer = createRpcServer({
      service,
      handlers: {
        TestCall: async (req) => {
          async function handlerFn (): Promise<never> {
            await sleep(5);
            throw new Error('TestError');
          }

          return await handlerFn();
        }
      },
      port: alicePort
    });

    const client = createRpcClient(service, {
      port: bobPort
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    let error!: Error;
    try {
      await client.rpc.TestCall({ data: 'requestData' });
    } catch (err: any) {
      error = err;
    }

    expect(error).toBeA(SerializedRpcError);
    expect(error.message).toEqual('TestError');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
    expect(error.stack?.includes('TestCall')).toEqual(true);
  });

  describe('streams', () => {
    const service = schema.getService('dxos.rpc.test.TestStreamService');
    let server: RpcPeer;
    let client: ProtoRpcClient<TestStreamService>;

    beforeEach(async () => {
      const [alicePort, bobPort] = createLinkedPorts();

      server = createRpcServer({
        service,
        handlers: {
          TestCall: (req) => {
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
        },
        port: alicePort
      });

      client = createRpcClient(service, {
        port: bobPort
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);
    });

    test('consumed stream', async () => {
      const stream = client.rpc.TestCall({ data: 'requestData' });

      expect(await Stream.consume(stream)).toEqual([
        { data: { data: 'foo' } },
        { data: { data: 'bar' } },
        { data: { data: 'baz' } },
        { closed: true }
      ]);
    });

    test('subscribed stream', async () => {
      const stream = client.rpc.TestCall({ data: 'requestData' });

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

      const TestService = schema.getService('dxos.rpc.test.TestService');
      const PingService = schema.getService('dxos.rpc.test.PingService');

      const services = createServiceBundle({
        TestService,
        PingService
      });

      const server: RpcPeer = createBundledRpcServer({
        services,
        handlers: {
          TestService: {
            TestCall: async (req) => {
              expect(req.data).toEqual('requestData');
              return { data: 'responseData' };
            }
          },
          PingService: {
            Ping: async (req) => ({ nonce: req.nonce })
          }
        },
        port: alicePort
      });

      const client = createMultiRpcClient(services, {
        port: bobPort
      });

      await Promise.all([
        server.open(),
        client.open()
      ]);

      const response = await client.rpc.TestService.TestCall({ data: 'requestData' });
      expect(response.data).toEqual('responseData');

      const ping = await client.rpc.PingService.Ping({ nonce: 5 });
      expect(ping.nonce).toEqual(5);
    });
  });
});
