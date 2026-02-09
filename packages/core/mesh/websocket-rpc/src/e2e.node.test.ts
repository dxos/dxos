//
// Copyright 2023 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { create, EMPTY } from '@dxos/protocols/buf';
import {
  TestService,
  TestRpcRequestSchema,
  TestRpcResponseSchema,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { createBufServiceBundle } from '@dxos/rpc';

import { WebsocketRpcClient } from './client';
import { WebsocketRpcServer } from './server';

const services = createBufServiceBundle({
  TestService,
});

describe('e2e', () => {
  test('roundtrip', async () => {
    const server = new WebsocketRpcServer({
      port: 12342,
      onConnection: async () => {
        return {
          exposed: services,
          handlers: {
            TestService: {
              testCall: async (request) => {
                return create(TestRpcResponseSchema, {
                  data: request.data,
                });
              },
              voidCall: async () => {
                return EMPTY;
              },
            },
          },
        };
      },
    });

    const client = new WebsocketRpcClient({
      url: 'ws://localhost:12342',
      requested: services,
    });

    await server.open();
    onTestFinished(() => server.close());
    await client.open();
    onTestFinished(() => client.close());

    const response = await client.rpc.TestService.testCall(create(TestRpcRequestSchema, { data: 'hello' }));
    expect(response.data).to.equal('hello');
  });
});
