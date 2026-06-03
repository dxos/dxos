//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import type { Config } from '@dxos/config';
import { type Context } from '@dxos/context';
import { type PublicKey } from '@dxos/keys';
import { isNode, range } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder } from './test-builder';

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

  // When storage is requested, allocate a unique SQLite file per client so
  // each peer's data persists independently across destroy/initialize cycles.
  const sqlitePaths = options?.storage
    ? range(count, () => `/tmp/dxos-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
    : [];

  if (sqlitePaths.length > 0) {
    ctx.onDispose(async () => {
      if (isNode()) {
        const { rmSync } = await import('node:fs');
        for (const path of sqlitePaths) {
          rmSync(path, { force: true });
        }
      }
    });
  }

  const clients = range(
    count,
    (index) =>
      new Client({
        config: options?.config,
        services: testBuilder.createLocalClientServices({
          ...options?.serviceConfig,
          ...(sqlitePaths.length > 0 ? { sqlitePath: sqlitePaths[index] } : {}),
        }),
      }),
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
