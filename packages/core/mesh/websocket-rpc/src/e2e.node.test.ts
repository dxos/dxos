//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';
import { describe, expect, onTestFinished, test } from 'vitest';

import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  TestRpcRequestSchema,
  TestRpcResponseSchema,
  TestService as TestServiceDesc,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { type ServiceTypesOf, createServiceBundle } from '@dxos/rpc';

import { WebsocketRpcClient } from './client';
import { WebsocketRpcServer } from './server';

type TestService = BufService<typeof TestServiceDesc>;

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
              testCall: async (request) => create(TestRpcResponseSchema, { data: request.data }),
              voidCall: async () => create(EmptySchema, {}),
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

    const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'hello' }));
    expect(response.data).to.equal('hello');
  });
});
