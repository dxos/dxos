//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import type { Config } from '@dxos/config';
import { type Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
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

export const createInitializedClientsWithContext = async (
  ctx: Context,
  count: number,
  options?: { config?: Config; serviceConfig?: { fastPeerPresenceUpdate?: boolean } },
): Promise<Client[]> => {
  const testBuilder = new TestBuilder(options?.config);

  const clients = range(
    count,
    () => new Client({ services: testBuilder.createLocalClientServices(options?.serviceConfig) }),
  );
  const initialized = await Promise.all(
    clients.map(async (c, index) => {
      await c.initialize();
      await c.halo.createIdentity({ displayName: `Peer ${index}` });
      return c;
    }),
  );
  ctx.onDispose(() => Promise.all(initialized.map((c) => c.destroy())));
  return initialized;
};
