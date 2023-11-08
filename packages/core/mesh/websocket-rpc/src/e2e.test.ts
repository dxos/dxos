//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { schema } from '@dxos/protocols';
import { createServiceBundle, type ServiceTypesOf } from '@dxos/rpc';
import { afterTest, describe, test } from '@dxos/test';

import { WebsocketRpcClient } from './client';
import { WebsocketRpcServer } from './server';

const services = createServiceBundle({
  TestService: schema.getService('example.testing.rpc.TestService'),
});

describe('e2e', () => {
  test('roundtrip', async () => {
    const server = new WebsocketRpcServer<{}, ServiceTypesOf<typeof services>>({
      port: 12342,
      onConnection: async () => {
        return {
          exposed: services,
          requested: {},
          handlers: {
            TestService: {
              testCall: async (request) => {
                return {
                  data: request.data,
                };
              },
              voidCall: async () => {},
            },
          },
        };
      },
    });

    const client = new WebsocketRpcClient<ServiceTypesOf<typeof services>, {}>({
      url: 'ws://localhost:12342',
      requested: services,
      exposed: {},
      handlers: {},
    });

    await server.open();
    afterTest(() => server.close());
    await client.open();
    afterTest(() => client.close());

    const response = await client.rpc.TestService.testCall({ data: 'hello' });
    expect(response.data).to.equal('hello');
  });
});
