//
// Copyright 2021 DXOS.org
//

import { sleep } from '@dxos/async';
import { expect } from 'earljs';
import { it as test } from 'mocha';
import { SerializedRpcError } from './errors';

import { schema } from './proto/gen';
import { RpcPeer } from './rpc';
import { createRpcClient, createRpcServer } from './service';

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const service = schema.getService('dxos.rpc.test.TestService');

    const server: RpcPeer = createRpcServer({
      service,
      handlers: {
        TestCall: async (req) => {
          expect(req.data).toEqual('requestData');
          return { data: 'responseData' };
        }
      },
      send: msg => client.receive(msg)
    });

    const client = createRpcClient(service, {
      send: msg => server.receive(msg)
    });

    await Promise.all([
      server.open(),
      client.open()
    ]);

    const response = await client.rpc.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });

  test('Errors are serialized', async () => {
    const service = schema.getService('dxos.rpc.test.TestService');

    const server: RpcPeer = createRpcServer({
      service,
      handlers: {
        TestCall: async (req) => {
          async function handlerFn(): Promise<never> {
            await sleep(5)
            throw new Error('TestError');
          }

          return await handlerFn();
        }
      },
      send: msg => client.receive(msg)
    });

    const client = createRpcClient(service, {
      send: msg => server.receive(msg)
    });

    
    
    await Promise.all([
      server.open(),
      client.open()
    ]);
    
    let error!: Error;
    try {
      await client.rpc.TestCall({ data: 'requestData' });
    } catch(err) {
      error = err;
    }

    expect(error).toBeA(SerializedRpcError)
    expect(error.message).toEqual('TestError');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
    expect(error.stack?.includes('TestCall')).toEqual(true);
  });
});
