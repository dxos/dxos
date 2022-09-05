//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Client, InvitationOffer, Item } from './api';

describe.skip('Experimental API', () => {
  test('Basic', async () => {
    const client = {} as Client;

    // Query contacts within circle.
    {
      const contacts = client.circle.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        await client.messenger.send(contact.key, {});
      }));
    }

    // Query spaces withing brane.
    {
      const spaces = client.brane.querySpaceKeys();

      // Create subscription.
      const space = await client.brane.getSpace(spaces.elements[0]);
      const result = space.queryItems({ type: 'org.dxos.contact' });
      const subscription = result.onUpdate((items: Item[]) => {
        subscription.cancel();
      });
    }

    // Create space and send invitation.
    {
      const space = await client.brane.createSpace();
      const contacts = client.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(contacts.elements[0].key);
      await client.messenger.send(contacts.elements[0].key, invitation);
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
