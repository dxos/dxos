# An Introduction to DXOS <!-- omit in toc -->

<!-- @toc -->

*   [1. Introduction](#1-introduction)
*   [2. Ontology](#2-ontology)
    *   [2.1. HALO](#21-halo)
        *   [2.1.1. Profiles](#211-profiles)
        *   [2.1.2. Devices](#212-devices)
        *   [2.1.3. Circles](#213-circles)
    *   [2.2. ECHO](#22-echo)
        *   [2.2.1. Spaces](#221-spaces)
        *   [2.2.2. Branes](#222-branes)
        *   [2.2.3. Frames](#223-frames)
*   [3. API](#3-api)

## 1. Introduction

DXOS is a collection of multiple decentralized systems that encompass Users, Agents, Databases, and Services.

## 2. Ontology

This section outlines the core concepts of the DXOS system.

### 2.1. HALO

*   HALO protocols and components relate to identity, privacy, security, and collaboration.
*   The HALO application is a software wallet that contains secrets (i.e., private keys) and credentials (e.g., decentralized credentials that may be used to access network services).

#### 2.1.1. Profiles

*   Users can create an unlimited number of self-sovereign identities.
*   Identities are controlled by public-private key pairs.
*   References may be shared via DIDs that contain public keys used to verify signatures.
    The DXOS blockchain implements a DID resolver.
*   Identities are not connected to each other in any way.
*   Agents include both human Users and long-lived autonomous systems, which may be sovereign, or controlled by (belong to) Users.

#### 2.1.2. Devices

*   Users maintain a set of devices that are associated with a Profile.
*   Devices include browsers, mobile apps, and remote network Agents.
*   Devices may be de-activated.
*   Devices store securely both HALO and ECHO data.

#### 2.1.3. Circles

*   Users maintain a set of contacts that are collectively known as a Circle.
*   Contacts are associated with another User's Profile DID and metadata (e.g., display name, avatar, etc.)

### 2.2. ECHO

*   ECHO protocols and components relate to data.

#### 2.2.1. Spaces

*   A Space is a decentralized collection of data identified by a public key.
*   Spaces may contain structured data that is kept consistent via unique ECHO data consensus protocols.
*   Spaces be accessed by multiple Users and Agents.
*   Spaces may be public or private.
*   Spaces may contain atomic data records called Items.
*   Items may be self-describing via the DXOS decentralized type system.
*   Items may reference other Items within the Space or contained within other Spaces.

#### 2.2.2. Branes

*   The collection of all Spaces accessible by a User is known as a Brane.

#### 2.2.3. Frames

*   Frames are application components that implement user interfaces that are able to display and manipulate data within a Space or across a User's Brane.
*   Frames may be dynamically discoverable (and loaded or activated) by querying decentralized registries.
*   Frames may declare bindings that are associated with the DXOS decentralized type system.

## 3. API

<!-- @code(../../packages/sdk/client/src/experimental/api.test.ts, link) -->

<sub>`@dxos/client`[`[src/experimental/api.test.ts]`](../../packages/sdk/client/src/experimental/api.test.ts)</sub>

```ts
//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { validateKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';

import { Client, InvitationOffer, Item, Role } from './api';

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Experimental API', () => {
  test('All aspects', async () => {
    const client1 = new Client(); // options possible

    //
    // Create and recover profiles.
    //
    {
      // Create profile.
      const privateKey = await client1.halo.createProfile();
      const { publicKey } = client1.halo.profile;
      expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();
      expect(client1.halo.device).toBeDefined();

      // Recover profile.
      // TODO(burdon): Currently requires another device to be online (to sync profile and complete.)
      {
        const client2 = new Client();
        expect(client2.halo.profile).not.toBeDefined();
        const profile = await client2.halo.recoverProfile(privateKey);
        expect(PublicKey.equals(profile.publicKey, client2.halo.profile.publicKey)).toBeTruthy();
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
        const client2 = new Client();
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
      const contacts = client1.contacts.queryContacts();
      await Promise.all(contacts.elements.map(async contact => {
        const receipt = await client1.messenger.send(contact.publicKey, { message: `Hello ${contact.username}!` });
        expect(receipt.recipient).toBe(contact.publicKey);
      }));
    }

    //
    // Create invitation to new peer (requires key exchange handshake).
    //
    {
      // Create Space.
      const space = await client1.spaces.createSpace();
      const invitation = space.createInvitation(Role.ADMIN);
      setImmediate(async () => {
        await invitation.wait();
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      });

      {
        // Accept invitation.
        const client2 = new Client();
        const challenge = client2.spaces.joinSpace(invitation);
        const spaceKey = await challenge.accept(invitation.secret);

        const space = await client2.spaces.getSpace(spaceKey);
        const members = space.queryMembers();
        expect(members.elements).toHaveLength(2);
      }
    }

    //
    // Create space and send invitation to existing contact.
    //
    {
      const space = await client1.spaces.createSpace();
      const contacts = client1.contacts.queryContacts({ name: 'alice' });
      const invitation = space.createInvitation(Role.ADMIN, contacts.elements[0].publicKey);
      await client1.messenger.send(contacts.elements[0].publicKey, invitation);
      await invitation.wait();

      const members = space.queryMembers({ role: Role.ADMIN });
      expect(members.elements).toHaveLength(2);
    }

    //
    // Receive invitations from existing contact.
    //
    {
      const invitations = client1.contacts.queryInvitations();
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
      const spaces = client1.spaces.querySpaceKeys();
      const space = await client1.spaces.getSpace(spaces.elements[0]);

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
      const items = client1.spaces.queryItems({ type: 'org.dxos.contact' });
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
```

