//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { schema } from './proto/gen';
import { RpcPeer } from './rpc';

describe('Protobuf service', () => {
  test('Works with protobuf service', async () => {
    const server = schema.getService('dxos.rpc.test.TestService').createServer({
      TestCall: async (req) => {
        expect(req.data).toEqual('requestData');
        return { data: 'responseData' };
      }
    });
    const serverRpc: RpcPeer = new RpcPeer({
      messageHandler: server.call.bind(server),
      send: msg => clientRpc.receive(msg)
    });

    const clientRpc = new RpcPeer({
      messageHandler: () => {
        throw new Error('Requests to client are not supported.');
      },
      send: msg => serverRpc.receive(msg)
    });
    const client = schema.getService('dxos.rpc.test.TestService').createClient({
      call: clientRpc.call.bind(clientRpc)
    });

    await Promise.all([
      serverRpc.open(),
      clientRpc.open(),
    ])

    const response = await client.TestCall({ data: 'requestData' });

    expect(response.data).toEqual('responseData');
  });
});
