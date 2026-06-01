//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { performInvitation } from '@dxos/client-services/testing';
import { type PublicKey } from '@dxos/keys';

import { Client } from '../client';
import { TestBuilder, waitForSpace } from '../testing';

/**
 * Waits until the given space key is no longer present in `client.spaces`.
 */
const waitForSpaceRemoval = async (client: Client, spaceKey: PublicKey, timeout = 1000): Promise<void> => {
  if (!client.spaces.get(spaceKey)) {
    return;
  }
  const trigger = new Trigger();
  const sub = client.spaces.subscribe(() => {
    if (!client.spaces.get(spaceKey)) {
      sub.unsubscribe();
      trigger.wake();
    }
  });
  onTestFinished(() => sub.unsubscribe());
  await asyncTimeout(trigger.wait(), timeout);
};

describe('Space deletion', () => {
  // Acceptance test: deleting a space on one device removes it on another device of the same identity.
  test('delete replicates across devices of the same identity', async ({ expect }) => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client1.destroy());
    await client1.initialize();
    await client1.halo.createIdentity({ displayName: 'test-user' });

    const client2 = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client2.destroy());
    await client2.initialize();

    // Join client2 to the same identity as client1 (replicating HALOs).
    await Promise.all(performInvitation({ host: client1.halo, guest: client2.halo }));

    // Create a space on device 1 and confirm it propagates to device 2 via the HALO.
    const space1 = await client1.spaces.create();
    await space1.waitUntilReady();
    const space2 = await waitForSpace(client2, space1.key, { timeout: 2000 });
    expect(space2.id).to.equal(space1.id);

    // Delete on device 1.
    await space1.delete();

    // The space leaves the local list on device 1...
    await waitForSpaceRemoval(client1, space1.key, 2000);
    expect(client1.spaces.get(space1.key)).to.be.undefined;

    // ...and replicates the tombstone to device 2.
    await waitForSpaceRemoval(client2, space1.key, 2000);
    expect(client2.spaces.get(space1.key)).to.be.undefined;
  });

  test('delete removes the space locally', async ({ expect }) => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client.destroy());
    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();
    await space.waitUntilReady();

    await space.delete();
    await waitForSpaceRemoval(client, space.key, 2000);
    expect(client.spaces.get(space.key)).to.be.undefined;
  });
});
