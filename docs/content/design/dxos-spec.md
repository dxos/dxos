# An Introduction to DXOS <!-- omit in toc -->

<!-- @toc -->

- [1. Introduction](#1-introduction)
- [2. Ontology](#2-ontology)
  - [2.1. HALO](#21-halo)
    - [2.1.1. Profiles](#211-profiles)
    - [2.1.2. Devices](#212-devices)
    - [2.1.3. Contacts](#213-contacts)
  - [2.2. ECHO](#22-echo)
    - [2.2.1. Spaces](#221-spaces)
    - [2.2.2. Branes](#222-branes)
    - [2.2.3. Frames](#223-frames)
- [3. API](#3-api)

## 1. Introduction

DXOS is a collection of multiple decentralized systems that encompass Users, Agents, Databases, and Services.

## 2. Ontology

This section outlines the core concepts of the DXOS system.

### 2.1. HALO

HALO is a set of components and protocols for decentralized identity and access control designed around privacy, security, and collaboration requirements.

- The HALO application is a software wallet that contains user identities, secrets (i.e., private keys) and other credentials.
- The HALO SDK is part of the DXOS client library and provides user authentication, profile, and contact management for app developers.
- The HALO protocol supports verification, transport, and exchange of identity information between networked peers.

#### Terminology

| term                | definition                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key, Keypair        | A cryptographic key which may have a public and private element.                                                                                                                                                                                                 |
| Identity            | An entity representing (identifying) an agent in the system (user or machine).                                                                                                                                                                                   |
| Credential          | A verifiably tamper-free statement from some verifiable authority that claims that some identity (subject) is to be granted or denied some rights (permissions) with respect to a given resource(s)                                                              |
| Device              | A unique client of the DXOS SDK such as a browser app (each browser profile is a separate device) or a CLI app, or a mobile app, ..., etc. An application may be used from multiple devices. Device authorization can be revoked at any time by the owning user. |
| Application         | Represents a specific application / agent which can request the user's identity and data. Applications can be used from multiple devices.                                                                                                                        |
| Profile             | An overloaded term that refers to a unit of isolation between different configurations or accounts on an application.                                                                                                                                            |
| Browser Profile     | Chromium has the notion of profiles which isolate browser state for all applications (domains) between the profiles, allowing users to sign in to multiple accounts and switch between their "browsing profiles" quickly.                                        |
| [HALO] User Profile | The `user.profile` object attached to a given identity which contains arbitrary keys and values that applications may deposit there on behalf of the user. This is where users store their avatar, name, email and other information about themselves.           |
|                     |                                                                                                                                                                                                                                                                  |

#### 2.1.1 The HALO Application

The HALO application provides a wallet where users can manage multiple identities and provides UI that enables passwordless sign-in to 3rd space applications via the HALO SDK. It is delivered as a mobile-first PWA, and later possibly also in a browser extension, if necessary.

The HALO application may be running on these URLs:

- `https://halo.dxos.org` (public prod)
- `http://halo.localhost` (local staging)

THE HALO application may be running in the following types of contexts:

- as a tab in any desktop browser
- as a PWA in a standalone window on a desktop machine
- as a tab in any mobile browser
- as a PWA installed to the home screen of a mobile device
- as a frame popped over a 3P app during a login process (in browser, or in a PWA)
- (future) as a frame owned by a browser extension

The HALO application may be invoked / started by the user or the OS for the following reasons:

- the user navigated to the app in a browser
- the user open the installed PWA
- the user clicked on a link in another app (such as Discord, or a QR code in a camera app) that starts with `dx://` or `https://halo.dxos.org...`
- the user is trying to sign into a 3P application that uses the HALO SDK

The HALO application exposes these key entities and verbs to users:

- Identities (list, use to sign in, create, import, delete)
- Devices (list, revoke)
- Application authorizations (list, revoke)
  - `TODO(zhenyasav): But for now devices are the only revocation unit we have.`

Here is the information/UI hierarchy of the HALO application:

- HALO Application / Home
  - Identities
    - Identity
      - Applications
      - Devices
      - Contacts
      - Settings

#### 2.1.2 Browser Profiles

The HALO app is constrained within a Browser profile which isolates local storage, cookies, history and other personal data between different silos in the browser. This means the HALO application state and list of managed identities will be reset with every new browser profile.

Using the app in a different profile will be equivalent to using the app from another device. Identities can be recovered into this new instance of HALO the same way as into a new device.

When an application is installed as a PWA, profile switching is not an experience in Chrome yet, and the app assumes the browser profile it was installed with. Edge supports profile switching for PWA apps. See [chrome's Windows PWA integration](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/windows_pwa_integration.md) and [this wishful thinking](https://chromeunboxed.com/google-chrome-should-steal-pwa-profiles-from-edge).

#### 2.1.2. Identities

Using the HALO app, users can:

- create and manage an unlimited number of self-sovereign identities.
- Identities may be shared across multiple devices via QR codes or links.
- Identities correspond to one or more public-private key pairs securely stored by HALO.
- References to identities may be shared as [DIDs](https://www.w3.org/TR/did-core/) that can be used to obtain public keys from the DXOS DID resolution service, which in turn can be used to verify signatures.
  - `TODO(zhenyasav): We dont have DID without DMG.`
- Identities are not connected to each other in any way.
- Agents with identities include both human Users and long-lived autonomous systems, which may be sovereign, or controlled by (belong to) Users.
- when prompted by a 3P app requesting user information via HALO SDK, users can select the identity they wish to use to sign into that app

#### 2.1.3. Devices

- Users maintain a set of devices that are associated with one or more Identities.
- Devices include browsers, mobile apps, and any other processes using the client (i.e. a remote bot).
- Devices may be de-activated.
- Devices securely store both HALO and ECHO data.

#### 2.1.3. Contacts

- Users maintain a set of contacts accumulated from interactions over spaces and invites
- Contacts are associated with another User's Profile DID and metadata (e.g., display name, avatar, etc.) when users join spaces or interact with each other.
- (Let it be known: A collection of contacts is a circle)

### 2.2. ECHO

- ECHO protocols and components relate to data.

#### 2.2.1. Spaces

- A Space is a decentralized collection of data identified by a public key.
- Spaces may contain structured data that is kept consistent via unique ECHO data consensus protocols.
- Spaces be accessed by multiple Users and Agents.
- Spaces may be public or private.
- Spaces may contain atomic data records called Items (objects?).
- (The main database is a key-value store)
- Items may be self-describing via the DXOS decentralized type system. (future)
- Items may reference other Items within the Space or contained within other Spaces.

#### 2.2.2. Branes

- The collection of all Spaces accessible by a User is known as a Brane.

#### 2.2.3. Frames

- Frames are application components that implement user interfaces that are able to display and manipulate data within a Space or across a User's Brane.
- Frames may be dynamically discoverable (and loaded or activated) by querying decentralized registries.
- Frames may declare bindings that are associated with the DXOS decentralized type system.

## 3. API

<!-- @code(../../packages/sdk/client/src/experimental/api.test.ts, link) -->

<sub>`@dxos/client`[`[src/experimental/api.test.ts]`](../../packages/sdk/client/src/experimental/api.test.ts)</sub>

```ts
//
// Copyright 2020 DXOS.org
//

import expect from "expect";
import { it as test } from "mocha";

import { validateKeyPair } from "@dxos/crypto";
import { PublicKey } from "@dxos/protocols";

import { Client, InvitationOffer, Item, Role } from "./api";

// import { Client } from "@dxos/client"

// eslint-disable-next-line jest/no-disabled-tests
describe.skip("Experimental API", () => {
  test("All aspects", async () => {
    const client1 = new Client({}); // options possible

    const client = useClient({
      halo: {
        authenticator: new CustomAuthenticator(),
      },
    });

    const {
      profile: { name, avatarUrl },
      identityKey,
      credentials,
    } = client.halo.identity;

    const { identity, loading, error } = client.halo.authenticate(); // popups
    // client.halo.identity

    // Create and recover profiles.
    //
    {
      // Obtain a profile from the user's wallet
      expect(client.halo.identity).not.to.be.defined;
      const identity = await client1.halo.authenticate(); // pops HALO UI if necessary
      const { publicKey } = client1.halo.identity; // may be undefined
      // expect(validateKeyPair(publicKey, privateKey)).toBeTruthy();
      expect(client1.halo.device).toBeDefined();

      // Recover profile.
      // TODO(burdon): Currently requires another device to be online (to sync profile and complete.)
      {
        const client2 = new Client();
        expect(client2.halo.identity).not.toBeDefined();
        const profile = await client2.halo.recoverIdentity("invite code");
        // expect(
        //   PublicKey.equals(profile.publicKey, client2.halo.profile.publicKey)
        // ).toBeTruthy();
      }
    }

    //
    // Manage devices.
    //
    {
      const devices = await client1.halo.getDevices();

      const observer = client.halo.getDevices().observe();

      expect(devices).toHaveLength(1);

      const identities = await client.halo.getIdentities(); // client devs dont do this
      // TODO(zhenyasa): Do we split vault getIdentities away from client?
      import { Vault } from "@dxos/vault";
      const vault = new Vault();
      const identities = await vault.getIdentities();

      // const devices = client.halo.devices;
      // devices.get()
      // devices.observe()
      // devices.query(() => {})

      // const collection = new Meteor.Collection('contacts');
      // const cursor = collection.find({});
      // const array = await cursor.toArray();

      // const observer = cursor.observe({
      //   added(object: T) {

      //   },
      //   changed(oldValue: T, newValue: T) {

      //   },
      //   removed(oldValue: T) {

      //   }
      // });

      // observer.stop();

      // Create and authenticate new device.
      {
        // get the whole set
        const subscription = client1.halo
          .getDevices()
          .observe((devices, subscription) => {
            if (devices.length > 1) {
              console.log("New device joined");
              subscription.stop();
            }
          });
        subscription.stop();

        // New device initiates the request to join.
        const client2 = new Client();
        expect(client2.halo.identity).not.toBeDefined();
        const request = client2.halo.createDeviceAdmissionRequest();

        // TODO(zhenya): This should be so in the vault api.
        const request = vault.devices.createAdmissionRequest();
        console.log(request.url, request.qrCode);

        // Accept new device.
        const challenge = vault.devices.acceptAdmissionRequest(request.url);

        setImmediate(async () => {
          const { publicKey } = await challenge.verify();
          expect(
            PublicKey.equals(publicKey, client2.halo.device.publicKey)
          ).toBeTruthy();
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
      const contacts = client1.halo.getContacts();
      await Promise.all(
        contacts.map(async (contact) => {
          const receipt = await client1.messenger.send(contact.publicKey, {
            hello: `Hello ${contact.username}!`,
          });
          expect(receipt.recipient).toBe(contact.publicKey);
        })
      );
    }

    //
    // Create invitation to new peer (requires key exchange handshake).
    //
    {
      // Create Space.
      const space = await client1.spaces.createSpace();
      const invitation = space.createInvitation(Role.ADMIN);
      {
        await invitation.wait();
        const members = await space.getMembers();
        const observer = space.getMembers().observe();
        expect(members).toHaveLength(2);
      }

      {
        // Accept invitation.
        const client2 = new Client();
        const challenge = client2.spaces.acceptInvitation(invitation);
        const space = await challenge.verify(invitation.secret);

        const space2 = await client2.spaces.getSpace(space.publicKey);
        const members = space2.getMembers();
        expect(members).toHaveLength(2);
        // to get all spaces
        client2.spaces.getSpaces();
        // TODO(zhenya): This will eventually be client.getSpaces().
      }
    }

    //
    // Create space and send invitation to existing contact.
    //
    {
      const space = await client1.spaces.createSpace();
      const contacts = client1.halo.getContacts({ name: "alice" });
      const invitation = space.createInvitation(contacts[0].publicKey, {
        role: Role.ADMIN,
      });

      await client1.messenger.send(contacts[0].publicKey, invitation);
      await invitation.wait();

      const members = space.getMembers({ role: Role.ADMIN });
      expect(members).toHaveLength(2);
    }

    import { send, listen } from "@dxos/messenger";

    client = new Client();
    const { stop } = listen((message) => {
      const space = await client.spaces.acceptInvitation(message);
    });

    //
    // Receive invitations from existing contact.
    //
    {
      const invitations = client1.contacts.getInvitations();
      const subscription = invitations.observe({
        async added(invitations: InvitationOffer[]) {
          if (invitations.length) {
            const space = await invitations[0].accept();
            expect(space).toBeDefined();
            subscription.cancel();
          }
        },
      });
    }

    //
    // Query spaces.
    //
    {
      const spaces = client1.spaces.getSpaces();
      const space = await client1.spaces.getSpace(spaces[0].publicKey);

      // Create subscription.
      const result = await space.query({ type: "org.dxos.contact" });
      const count = result.length;
      
      const subscription = space.query().observe((allResults) => {

      });

      const subscription = space.query({ type: "org.dxos.contact" }).observe({
        async added(items: Item[], subscription) {
          if (items.length >= count) {
            subscription.cancel(); // we might need this to be awaitable too?
          }
        },
        async removed(items: Item[]) {},
        async changed(oldItem: Item, newItem: Item) {}
      });


      // Create item.
      const item = await space.createItem({ type: "org.dxos.contact" });
      expect(item.publicKey).toBeDefined();

      // Query items across all spaces.
      const items = await client1.spaces.query({ type: "org.dxos.contact" });
      expect(items.length).toBeGreaterThan(0);
    }

    //
    // Query DXNS metagraph (e.g., KUBEs, applications, type system).
    //
    {
      import { Client, Record } from "@dxos/dxns";

      type AppRecord = { name: string };
      const AppRecordType = "org.dxos.app";

      const dxns = new Client();

      // Query records.
      const apps = dxns.queryRecords({ type: AppRecordType });
      apps.observe({
        async added(records: Record<AppRecord>[], subscription) {
          expect(subscription.query.type).toStrictEqual(AppRecordType);
          if (records.length > 0) {
            subscription.cancel();
          }
        },
      });

      // Create record.
      const app = await dxns.createRecord<AppRecord>({
        type: AppRecordType,
        data: { name: "Tetris" },
      });
      expect(app.type).toStrictEqual(AppRecordType);
      expect(app.data.name).toStrictEqual("Tetris");
    }
  });
});
```
