//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { type PublicKey } from '@dxos/keys';

import { type Client } from '../client';

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
