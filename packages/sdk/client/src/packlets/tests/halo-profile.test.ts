//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

describe('Halo', () => {
  test('creates a profile', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createProfile({ displayName: 'test-user' });
    expect(client.halo.profile).exist;

    expect(await client.halo.queryDevices()).to.have.lengthOf(1);
    expect(client.halo.profile?.displayName).to.equal('test-user');
  });

  test('device invitations', async () => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client1.destroy());
    await client1.initialize();

    await client1.halo.createProfile({ displayName: 'test-user' });
    expect(client1.halo.profile).exist;

    expect(await client1.halo.queryDevices()).to.have.lengthOf(1);

    const client2 = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client2.destroy());
    await client2.initialize();

    const done = new Trigger();
    const invitation = client1.halo.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    invitation.subscribe({
      onSuccess: async (invitation) => {
        client2.halo.acceptInvitation(invitation, { type: Invitation.Type.INTERACTIVE_TESTING });
        done.wake();
      },
      onError: (error) => {
        throw error;
      }
    });

    await done.wait();

    expect(await client1.halo.queryDevices()).to.have.lengthOf(2);
    expect(await client2.halo.queryDevices()).to.have.lengthOf(2);
  });
});
