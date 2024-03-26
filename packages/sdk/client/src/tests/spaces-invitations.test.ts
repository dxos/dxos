//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { performInvitation } from '@dxos/client-services/testing';
import { log } from '@dxos/log';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { type SpaceProxy } from '../echo';
import { TestBuilder, testSpaceAutomerge, waitForSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createLocal() });
    const client2 = new Client({ services: testBuilder.createLocal() });
    await client1.initialize();
    await client2.initialize();
    await client1.halo.createIdentity({ displayName: 'Peer 1' });
    await client2.halo.createIdentity({ displayName: 'Peer 2' });

    log('initialized');

    afterTest(() => Promise.all([client1.destroy()]));
    afterTest(() => Promise.all([client2.destroy()]));

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [{ invitation: hostInvitation }, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({
        host: space1 as SpaceProxy,
        guest: client2.spaces,
      }),
    );
    expect(guestInvitation?.spaceKey).to.deep.eq(space1.key);
    expect(hostInvitation?.spaceKey).to.deep.eq(guestInvitation?.spaceKey);
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);

    {
      const space = await waitForSpace(client2, guestInvitation!.spaceKey!, { ready: true });
      await testSpaceAutomerge(space.db);
    }
  });
});
