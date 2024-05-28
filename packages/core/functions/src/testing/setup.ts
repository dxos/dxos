//
// Copyright 2024 DXOS.org
//

import { FunctionsPlugin } from '@dxos/agent';
import { Client, Config } from '@dxos/client';
import { type TestBuilder } from '@dxos/client/testing';
import { range } from '@dxos/util';

import { TestType } from './types';
import { FunctionDef, FunctionTrigger } from '../types';

// TODO(burdon): Extend/wrap TestBuilder.

export const createInitializedClients = async (testBuilder: TestBuilder, count: number = 1, config?: Config) => {
  const clients = range(count).map(() => new Client({ config, services: testBuilder.createLocalClientServices() }));
  testBuilder.ctx.onDispose(() => Promise.all(clients.map((client) => client.destroy())));
  return Promise.all(
    clients.map(async (client, index) => {
      await client.initialize();
      await client.halo.createIdentity({ displayName: `Peer ${index}` });
      client.addSchema(FunctionDef, FunctionTrigger, TestType);
      return client;
    }),
  );
};

export const createFunctionRuntime = async (testBuilder: TestBuilder): Promise<Client> => {
  const config = new Config({
    runtime: {
      agent: {
        plugins: [{ id: 'dxos.org/agent/plugin/functions', config: { port: 8080 } }],
      },
    },
  });

  const [client] = await createInitializedClients(testBuilder, 1, config);
  const plugin = new FunctionsPlugin();
  await plugin.initialize({ client, clientServices: client.services });
  await plugin.open();
  testBuilder.ctx.onDispose(() => plugin.close());
  return client;
};
