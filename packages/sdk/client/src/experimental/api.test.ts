//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { validateKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';

import { Client, InvitationOffer, Item, Role } from './api';

const createClient = () => ({} as Client);

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Experimental API', () => {
  test('All aspects', async () => {
    const client = createClient();

    // Create profile.
    {
      const privateKey = await client.halo.createProfile();
      const publicKey = client.halo.profile.identityKey;
      expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();
      expect(client.halo.device).toBeDefined();

      // Recover profile.
      // TODO(burdon): Currently requires another device to be online (to sync profile and complete.)
      {
        const client = createClient();
        expect(client.halo.profile).not.toBeDefined();
        const profile = await client.halo.recoverProfile(privateKey);
        expect(PublicKey.equals(profile.identityKey, client.halo.profile.identityKey)).toBeTruthy();
      }
    }

    // Manage devices.
    {
      const devices = client.halo.queryDevices();
      expect(devices.elements).toHaveLength(1);

      // Create new device.
      {
        devices.onUpdate((devices, subscription) => {
          if (devices.length > 1) {
            console.log('New device joined');
            subscription.cancel();
          }
        });

        // New device initiates the request to join.
        const newClient = createClient();
        expect(newClient.halo.profile).not.toBeDefined();
        const request = newClient.halo.createDeviceAdmissionRequest();

        // Accept new device.
        const challenge = client.halo.createDeviceAdmissionChallenge(request.requestKey);
        setImmediate(async () => {
          const deviceKey = await challenge.wait();
          expect(PublicKey.equals(deviceKey, newClient.halo.device.deviceKey)).toBeTruthy();
        });

        // Authenticate.
        setImmediate(async () => {
          await request.accept(challenge.secret);
        });
      }
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
        const receipt = await client.messenger.send(contact.identityKey, { message: `Hello ${contact.username}!` });
        expect(receipt.recipient).toBe(contact.identityKey);
      }));
    }

    // Create invitation to new peer (requires key exchange handshake).
    {
      const space = await client.brane.createSpace();
      const invitation = space.createInvitation(Role.ADMIN);
      setImmediate(async () => {
        await invitation.wait();
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      });

      {
        const client = createClient();
        const offer = client.brane.createInvitationOffer(invitation.offerKey);
        const spaceKey = await offer.accept(invitation.secret);
        const space = await client.brane.getSpace(spaceKey);
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      }
    }

    // Create space and send invitation to existing contact.
    {
      const space = await client.brane.createSpace();
      const contacts = client.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(Role.ADMIN, contacts.elements[0].identityKey);
      await client.messenger.send(contacts.elements[0].identityKey, invitation);
      await invitation.wait();

      const members = space.queryMembers({ role: Role.ADMIN });
      expect(members.elements).toHaveLength(2);
    }

    // Receive invitations from existing contact.
    {
      const invitations = client.circle.queryInvitations();
      const subscription = invitations.onUpdate(async (invitations: InvitationOffer[]) => {
        if (invitations.length) {
          const spaceKey = await invitations[0].accept();
          expect(spaceKey).toBeDefined();
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
