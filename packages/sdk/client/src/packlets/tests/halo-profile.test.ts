//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Halo', () => {
  test('creates a profile', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createProfile({ displayName: 'test-user' });
    expect(client.halo.profile).exist;

    expect(await client.halo.queryDevices().value).to.have.lengthOf(1);
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

    const done1 = new Trigger();
    const done2 = new Trigger();
    const invitation = client1.halo.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    invitation.subscribe({
      onConnecting: (invitation) => {
        const invitation2 = client2.halo.acceptInvitation(invitation, { type: Invitation.Type.INTERACTIVE_TESTING });
        invitation2.subscribe({
          onSuccess: () => {
            done2.wake();
          },
          onError: (error) => {
            throw error;
          }
        });
      },
      onSuccess: async (invitation) => {
        done1.wake();
      },
      onError: (error) => {
        throw error;
      }
    });

    await done1.wait();
    await done2.wait();

    expect(await client1.halo.queryDevices()).to.have.lengthOf(2);
    expect(await client2.halo.queryDevices()).to.have.lengthOf(2);
  });
});
