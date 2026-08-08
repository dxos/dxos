//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { Client } from '../client';

describe('SpaceProxy properties', () => {
  test('a space whose creation was interrupted before its properties were written still opens', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();

    // Genesis only. `spaces.create` follows this with a client-side properties write, so skipping
    // it reproduces a creation interrupted in between — the state that used to leave the space
    // permanently initializing and its update mutex held for the lifetime of the session.
    const { spaceKey } = await client.services.services.SpacesService!.createSpace({
      tags: [],
      membershipPolicy: MembershipPolicy.INVITE,
    });

    const space = await asyncTimeout(
      new Promise<Space>((resolve) => {
        // The space list replays on subscribe, so the callback can run before `subscribe` returns;
        // unsubscribing through the handle it returns would read it in its TDZ.
        let subscription: { unsubscribe: () => void } | undefined;
        let resolved = false;
        const onSpaces = (spaces: Space[]) => {
          const match = spaces.find(({ key }) => key.equals(spaceKey));
          if (match) {
            resolved = true;
            subscription?.unsubscribe();
            resolve(match);
          }
        };
        subscription = client.spaces.subscribe(onSpaces);
        if (resolved) {
          subscription.unsubscribe();
        }
      }),
      5_000,
      'space proxy published',
    );

    await space.waitUntilReady();
    expect(space.properties).toBeDefined();

    await client.destroy();
  }, 60_000);
});
