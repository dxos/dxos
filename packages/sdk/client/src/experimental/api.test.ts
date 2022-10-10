//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { validateKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

import { Client, InvitationOffer, Item, Role } from './api.js';

const createClient = () => ({} as Client);

describe.skip('Experimental API', function () {
  it('All aspects', async function () {
    const client1 = createClient();

    //
    // Create and recover profiles.
    //
    {
      // Create profile.
      const privateKey = await client1.halo.createProfile();
      const publicKey = client1.halo.profile.identityKey;
      expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();
      expect(client1.halo.device).toBeDefined();

      // Recover profile.
      // TODO(burdon): Currently requires another device to be online (to sync profile and complete.)
      {
        const client2 = createClient();
        expect(client2.halo.profile).not.toBeDefined();
        const profile = await client2.halo.recoverProfile(privateKey);
        expect(PublicKey.equals(profile.identityKey, client2.halo.profile.identityKey)).toBeTruthy();
      }
    }

    //
    // Manage devices.
    //
    {
      const devices = client1.halo.queryDevices();
      expect(devices.elements).toHaveLength(1);

      // Create and authenticate new device.
      {
        devices.onUpdate((devices, subscription) => {
          if (devices.length > 1) {
            console.log('New device joined');
            subscription.cancel();
          }
        });

        // New device initiates the request to join.
        const client2 = createClient();
        expect(client2.halo.profile).not.toBeDefined();
        const request = client2.halo.createDeviceAdmissionRequest();

        // Accept new device.
        const challenge = client1.halo.createDeviceAdmissionChallenge(request.requestKey);
        setImmediate(async () => {
          const deviceKey = await challenge.wait();
          expect(PublicKey.equals(deviceKey, client2.halo.device.deviceKey)).toBeTruthy();
        });

        // Authenticate.
        setImmediate(async () => {
          await request.accept(challenge.secret);
        });
      }
    }

    //
    // Query contacts within circle.
    //
    {
      const contacts = client1.circle.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        const receipt = await client1.messenger.send(contact.identityKey, { message: `Hello ${contact.username}!` });
        expect(receipt.recipient).toBe(contact.identityKey);
      }));
    }

    //
    // Create invitation to new peer (requires key exchange handshake).
    //
    {
      // Create Space.
      const space = await client1.brane.createSpace();
      const invitation = space.createInvitation(Role.ADMIN);
      setImmediate(async () => {
        await invitation.wait();
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      });

      {
        // Accept invitation.
        const client2 = createClient();
        const offer = client2.brane.createInvitationOffer(invitation.offerKey);
        const spaceKey = await offer.accept(invitation.secret);

        const space = await client2.brane.getSpace(spaceKey);
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      }
    }

    //
    // Create space and send invitation to existing contact.
    //
    {
      const space = await client1.brane.createSpace();
      const contacts = client1.circle.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(Role.ADMIN, contacts.elements[0].identityKey);
      await client1.messenger.send(contacts.elements[0].identityKey, invitation);
      await invitation.wait();

      const members = space.queryMembers({ role: Role.ADMIN });
      expect(members.elements).toHaveLength(2);
    }

    //
    // Receive invitations from existing contact.
    //
    {
      const invitations = client1.circle.queryInvitations();
      const subscription = invitations.onUpdate(async (invitations: InvitationOffer[]) => {
        if (invitations.length) {
          const spaceKey = await invitations[0].accept();
          expect(spaceKey).toBeDefined();
          subscription.cancel();
        }
      });
    }

    //
    // Query spaces within brane.
    //
    {
      const spaces = client1.brane.querySpaceKeys();
      const space = await client1.brane.getSpace(spaces.elements[0]);

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
      expect(item.id).toBeDefined();

      // Query items across all spaces.
      const items = client1.brane.queryItems({ type: 'org.dxos.contact' });
      expect(items.elements.length).toBeGreaterThan(0);
    }

    //
    // Query DXNS metagraph (e.g., KUBEs, applications, type system).
    //
    {
      type AppRecord = { name: string }
      const AppRecordType = 'org.dxos.app';

      // Query records.
      const apps = client1.meta.queryRecords({ type: AppRecordType });
      void apps.onUpdate((records, subscription) => {
        expect(subscription.query.type).toStrictEqual(AppRecordType);
        if (records.length > 0) {
          subscription.cancel();
        }
      });

      // Create record.
      const app = await client1.meta.createRecord<AppRecord>({ type: AppRecordType, data: { name: 'Tetris' } });
      expect(app.type).toStrictEqual(AppRecordType);
      expect(app.data.name).toStrictEqual('Tetris');
    }
  });
});
