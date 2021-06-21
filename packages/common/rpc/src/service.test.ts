//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

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
});
