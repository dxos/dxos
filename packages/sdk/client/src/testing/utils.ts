//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import type { Config } from '@dxos/config';
import { type Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { range } from '@dxos/util';

import { TestBuilder } from './test-builder';
import { Client } from '../client';

type Options = {
  timeout?: number;
  ready?: boolean;
};

export const waitForSpace = async (
  client: Client,
  spaceKey: PublicKey,
  { timeout = 500, ready }: Options = {},
): Promise<Space> => {
  let space = client.spaces.get(spaceKey);

  if (!space) {
    const spaceTrigger = new Trigger<Space>();
    const sub = client.spaces.subscribe(() => {
      const space = client.spaces.get(spaceKey);
      if (space) {
        sub.unsubscribe();
        spaceTrigger.wake(space);
      }
    });
    space = await spaceTrigger.wait({ timeout });
  }

  if (ready) {
    await space.waitUntilReady();
  }

  return space;
};

export type CreateInitializedClientsOptions = {
  config?: Config;
  storage?: boolean;
  serviceConfig?: { fastPeerPresenceUpdate?: boolean };
};

export const createInitializedClientsWithContext = async (
  ctx: Context,
  count: number,
  options?: CreateInitializedClientsOptions,
): Promise<Client[]> => {
  const testBuilder = new TestBuilder(options?.config);
  testBuilder.storage = options?.storage ? createStorage({ type: StorageType.RAM }) : undefined;
  testBuilder.level = options?.storage ? createTestLevel() : undefined;

  const clients = range(
    count,
    () =>
      new Client({ config: options?.config, services: testBuilder.createLocalClientServices(options?.serviceConfig) }),
  );
  const initialized = await Promise.all(
    clients.map(async (client, index) => {
      await client.initialize();
      await client.halo.createIdentity({ displayName: `Peer ${index}` });
      return client;
    }),
  );
  ctx.onDispose(() => Promise.all(initialized.map((c) => c.destroy())));
  return initialized;
};
