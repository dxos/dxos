//
// Copyright 2024 DXOS.org
//

import { Client, type Config } from '@dxos/client';
import { type TestBuilder } from '@dxos/client/testing';
import { range } from '@dxos/util';

export const createInitializedClients = async (testBuilder: TestBuilder, count: number = 1, config?: Config) => {
  const clients = range(count).map(() => new Client({ config, services: testBuilder.createLocalClientServices() }));
  testBuilder.ctx.onDispose(() => Promise.all(clients.map((c) => c.destroy())));
  return Promise.all(
    clients.map(async (c, index) => {
      await c.initialize();
      await c.halo.createIdentity({ displayName: `Peer ${index}` });
      return c;
    }),
  );
};
