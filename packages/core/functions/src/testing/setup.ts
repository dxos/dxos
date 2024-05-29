//
// Copyright 2024 DXOS.org
//

import path from 'node:path';

import { waitForCondition } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type TestBuilder } from '@dxos/client/testing';
import { range } from '@dxos/util';

import { TestType } from './types';
import { FunctionRegistry } from '../function';
import { DevServer, type DevServerOptions, Scheduler } from '../runtime';
import { TriggerRegistry } from '../trigger';
import { FunctionDef, FunctionTrigger } from '../types';

let functionsPort = 8080;

export type FunctionsPluginInitializer = (client: Client) => Promise<{ close: () => Promise<void> }>;

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

export const createFunctionRuntime = async (
  testBuilder: TestBuilder,
  pluginInitializer: FunctionsPluginInitializer,
): Promise<Client> => {
  const config = new Config({
    runtime: {
      agent: {
        plugins: [{ id: 'dxos.org/agent/plugin/functions', config: { port: functionsPort++ } }],
      },
    },
  });

  const [client] = await createInitializedClients(testBuilder, 1, config);
  const plugin = await pluginInitializer(client);
  testBuilder.ctx.onDispose(() => plugin.close());
  return client;
};

export const startFunctionsHost = async (
  testBuilder: TestBuilder,
  pluginInitializer: FunctionsPluginInitializer,
  options?: DevServerOptions,
) => {
  const functionRuntime = await createFunctionRuntime(testBuilder, pluginInitializer);
  const functionsRegistry = new FunctionRegistry(functionRuntime);
  const devServer = await startDevServer(testBuilder, functionRuntime, functionsRegistry, options);
  const scheduler = await startScheduler(testBuilder, functionRuntime, devServer, functionsRegistry);
  return {
    client: functionRuntime,
    waitHasActiveTriggers: async (space: Space) => {
      await waitForCondition({ condition: () => scheduler.triggers.getActiveTriggers(space).length > 0 });
    },
  };
};

const startScheduler = async (
  testBuilder: TestBuilder,
  client: Client,
  devServer: DevServer,
  functionRegistry: FunctionRegistry,
) => {
  const triggerRegistry = new TriggerRegistry(client);
  const scheduler = new Scheduler(functionRegistry, triggerRegistry, { endpoint: devServer.endpoint });
  await scheduler.start();
  testBuilder.ctx.onDispose(() => scheduler.stop());
  return scheduler;
};

const startDevServer = async (
  testBuilder: TestBuilder,
  client: Client,
  functionRegistry: FunctionRegistry,
  options?: { baseDir?: string },
) => {
  const server = new DevServer(client, functionRegistry, {
    baseDir: path.join(__dirname, '../testing'),
    ...options,
  });
  await server.start();
  testBuilder.ctx.onDispose(() => server.stop());
  return server;
};
