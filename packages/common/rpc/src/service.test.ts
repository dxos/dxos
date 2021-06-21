//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { sleep } from '@dxos/async';

import { SerializedRpcError } from './errors';
import { schema } from './proto/gen';
import { RpcPeer } from './rpc';
import { createRpcClient, createRpcServer } from './service';
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
    } catch (err) {
      error = err;
    }

    expect(error).toBeA(SerializedRpcError);
    expect(error.message).toEqual('TestError');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
    expect(error.stack?.includes('TestCall')).toEqual(true);
  });
});
