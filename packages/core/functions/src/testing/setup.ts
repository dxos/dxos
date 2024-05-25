//
// Copyright 2024 DXOS.org
//

import { FunctionsPlugin } from '@dxos/agent';
import { Client, Config } from '@dxos/client';
import { type TestBuilder } from '@dxos/client/testing';
import { range } from '@dxos/util';

import { TestType } from './types';
import { FunctionDef, FunctionTrigger } from '../types';

// TODO(burdon): Create new or extend existing TestBuilder.

export const createInitializedClients = async (testBuilder: TestBuilder, count: number = 1, config?: Config) => {
  const clients = range(count).map(() => new Client({ config, services: testBuilder.createLocalClientServices() }));
  testBuilder.ctx.onDispose(() => Promise.all(clients.map((c) => c.destroy())));
  return Promise.all(
    clients.map(async (client, index) => {
      await client.initialize();
      await client.halo.createIdentity({ displayName: `Peer ${index}` });
      client.addSchema(TestType, FunctionDef, FunctionTrigger);
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

  const client = (await createInitializedClients(testBuilder, 1, config))[0];

  // TODO(burdon): Better way to configure plugin? (Rationalize chess.test).
  const functionsPlugin = new FunctionsPlugin();
  await functionsPlugin.initialize({ client, clientServices: client.services });
  await functionsPlugin.open();
  testBuilder.ctx.onDispose(() => functionsPlugin.close());
  return client;
};
