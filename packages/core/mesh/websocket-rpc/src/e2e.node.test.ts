//
// Copyright 2023 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { getBufService } from '@dxos/protocols/buf-service';
import { type TestService } from '@dxos/protocols/proto/example/testing/rpc';
import { type ServiceTypesOf, createServiceBundle } from '@dxos/rpc';

import { WebsocketRpcClient } from './client.ts';
import { WebsocketRpcServer } from './server.ts';

const services = createServiceBundle({
  TestService: getBufService<TestService>('example.testing.rpc.TestService'),
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
              testCall: async (request: any) => {
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
    onTestFinished(() => server.close());
    await client.open();
    onTestFinished(() => client.close());

    const response = await client.rpc.TestService.testCall({ data: 'hello' });
    expect(response.data).to.equal('hello');
  });
});
