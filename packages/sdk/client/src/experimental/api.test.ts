//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { validateKeyPair } from '@dxos/crypto';

import { Client, InvitationOffer, Item } from './api';

const createClient = () => ({} as Client);

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Experimental API', () => {
  test('Basic', async () => {
    const client = createClient();

    // Create profile.
    {
      const privateKey = await client.halo.createProfile();
      const publicKey = client.halo.profile.publicKey;
      expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();

      // Recovery.
      // TODO(burdon): Currently requires another device to be online (to sync profile and complete.)
      {
        const client = createClient();
        expect(client.halo.profile).not.toBeDefined();
        const profile = await client.halo.recoverProfile(privateKey);
        expect(profile.publicKey).toBe(client.halo.profile.publicKey);
      }
    }

    // TODO(burdon): Manage devices.
    {
      const devices = client.halo.queryDevices();
      expect(devices.elements).toHaveLength(1);
    }

    // TODO(burdon): Query DXNS graph (e.g., type system).
    {
      const types = client.meta.queryRecords({ type: 'org.dxos.contact' });
      expect(types).toBeDefined();
    }

    // Query contacts within circle.
    {
      const contacts = client.circle.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        await client.messenger.send(contact.publicKey, {});
      }));
    }

    // Query spaces withing brane.
    {
      const spaces = client.brane.querySpaceKeys();

      // Create subscription.
      const space = await client.brane.getSpace(spaces.elements[0]);
      const result = space.queryItems({ type: 'org.dxos.contact' });
      const subscription = result.onUpdate((items: Item[]) => {
        console.log(items.length);
        subscription.cancel();
      });
    }

    // Create space and send invitation.
    {
      const space = await client.brane.createSpace();
      const contacts = client.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(contacts.elements[0].publicKey);
      await client.messenger.send(contacts.elements[0].publicKey, invitation);
      await invitation.wait();
    }

    // Receive invitations.
    {
      const invitations = client.circle.queryInvitations();
      const subscription = invitations.onUpdate(async (invitations: InvitationOffer[]) => {
        if (invitations.length) {
          await invitations[0].accept();
          subscription.cancel();
        }
      });
    }

    // Query items across all spaces.
    {
      const items = client.brane.queryItems({ type: 'org.dxos.contact' });
      console.log(items.elements);
    }

    expect(true).toBeTruthy();
  });
});
