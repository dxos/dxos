//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { TestClient } from './api';

describe('Experimental API', () => {
  test('Basic', async () => {
    const client = new TestClient();

    // Query contacts within circle.
    {
      const contacts = client.circle.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        await client.messenger.send(contact.key, {});
      }));
    }

    // Query spaces withing brane.
    {
      const spaces = client.brane.querySpaces();
      spaces.elements.forEach(space => {
        const items = space.query();
        console.log(items.elements);
      });
    }

    // Create space and send invitation.
    // TODO(burdon): Receive invitations and other messages.
    {
      const space = await client.brane.createSpace();
      const contacts = client.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(contacts.elements[0].key);
      await client.messenger.send(contacts.elements[0].key, invitation);
      await invitation.wait();
    }

    // Query items across all spaces.
    {
      const items = client.brane.querySpaces({ type: 'org.dxos.contact' });
      console.log(items.elements);
    }

    expect(true).toBeTruthy();
  });
});
