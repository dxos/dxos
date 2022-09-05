//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { validateKeyPair } from '@dxos/crypto';

import { Client, InvitationOffer, Item, Role } from './api';

const createClient = () => ({} as Client);

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Experimental API', () => {
  test('All aspects', async () => {
    const client = createClient();

    // Create profile.
    {
      const privateKey = await client.halo.createProfile();
      const publicKey = client.halo.profile.publicKey;
      expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();
      expect(client.halo.device).toBeDefined();

      // Recover profile.
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

    // Query DXNS metagraph (e.g., KUBEs, applications, type system).
    {
      type AppRecord = { name: string }
      const AppRecordType = 'org.dxos.app';

      const apps = client.meta.queryRecords({ type: AppRecordType });
      void apps.onUpdate((records, subscription) => {
        expect(subscription.query.type).toStrictEqual(AppRecordType);
        if (records.length > 0) {
          subscription.cancel();
        }
      });

      const app = await client.meta.createRecord<AppRecord>({ type: AppRecordType, data: { name: 'Tetris' } });
      expect(app.type).toStrictEqual(AppRecordType);
      expect(app.data.name).toStrictEqual('Tetris');
    }

    // Query contacts within circle.
    {
      const contacts = client.circle.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        const profile = contact.profile;
        const receipt = await client.messenger.send(contact.publicKey, { message: `Hello ${profile.username}!` });
        expect(receipt.recipient).toBe(contact.publicKey);
      }));
    }

    // Create space and send invitation.
    {
      const space = await client.brane.createSpace();
      const contacts = client.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(contacts.elements[0].publicKey, Role.ADMIN);
      await client.messenger.send(contacts.elements[0].publicKey, invitation);
      await invitation.wait();

      const members = space.queryMembers({ role: Role.ADMIN });
      expect(members.elements).toHaveLength(2);
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

    // Query spaces within brane.
    {
      const spaces = client.brane.querySpaceKeys();
      const space = await client.brane.getSpace(spaces.elements[0]);

      // Create subscription.
      const result = space.database.queryItems({ type: 'org.dxos.contact' });
      const count = result.elements.length;
      const subscription = result.onUpdate((items: Item[]) => {
        if (items.length > count) {
          subscription.cancel();
        }
      });

      // Create item.
      const item = await space.database.createItem({ type: 'org.dxos.contact' });
      expect(item.publicKey).toBeDefined();

      // Query items across all spaces.
      const items = client.brane.queryItems({ type: 'org.dxos.contact' });
      expect(items.elements.length).toBeGreaterThan(0);
    }
  });
});
