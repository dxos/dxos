//
// Copyright 2021 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import type { Space } from '@dxos/client-protocol';
import { type PublicKey } from '@dxos/keys';
import { type Contact, Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { range } from '@dxos/util';

import { Obj } from '@dxos/echo';
import { Client } from '../client';
import { TestBuilder, TextV0Type, performInvitation, waitForSpace } from '../testing';

describe('ContactBook', () => {
  describe('joinBySpaceKey', () => {
    test('base case', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);
      const space2 = await client1.spaces.create();
      await space2.admitContact(contact);
      await joinSpaceAndCheck(space2, client2);
    });

    test('any peer can be online when client joins by admission', async () => {
      const [client1, client2, client3] = await createInitializedClients(3);
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);
      const space2 = await client1.spaces.create();
      await inviteMember(space2, client3);
      await space2.admitContact(contact);
      await waitForCondition({ condition: () => findSpace(client3, space2.key).members.get().length === 3 });
      await client1.destroy();
      await joinSpaceAndCheck(space2, client2);
    });

    test('data replication', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);

      client1.addTypes([TextV0Type]);
      const space2 = await client1.spaces.create();
      const document = space2.db.add(Obj.make(TextV0Type, { content: 'text' }));
      await space2.db.flush();

      await space2.admitContact(contact);
      await joinSpaceAndCheck(space2, client2);
      const guestSpace = await waitForSpace(client2, space2.key, { ready: true });
      await expectDocumentReplicated(guestSpace, document);

      document.content = 'Hello, world!';
      await space2.db.flush();
      await expectDocumentReplicated(guestSpace, document);
    });
  });

  const expectDocumentReplicated = async (space: Space, expected: TextV0Type) => {
    await waitForCondition({
      condition: () => {
        const actual = space.db.getObjectById(expected.id);
        return actual?.content === expected.content;
      },
      timeout: 1000,
    });
  };

  describe('contacts', () => {
    test('contact appears in contact book after joining a space', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const space = await client1.spaces.create();
      expectNoContacts(client1);
      await inviteMember(space, client2);
      const contacts = await waitForContactBookSize(client1, 1);
      expectInContactBook(contacts, client2);
    });

    test('same contact in multiple spaces', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const spaces: Space[] = [];
      for (let i = 0; i < 3; i++) {
        const space = await client1.spaces.create();
        await inviteMember(space, client2);
        spaces.push(space);
      }
      const allSpacesReflected = () => client1.halo.contacts.get()[0].commonSpaces?.length === spaces.length;
      await waitForCondition({ condition: allSpacesReflected });
      const contact = expectInContactBook(client1.halo.contacts.get(), client2);
      const expectedSpaces = spaces.map((s) => s.key.toHex()).sort();
      expect(contact.commonSpaces?.map((k) => k.toHex()).sort()).to.deep.eq(expectedSpaces);
    });

    test('different contacts in different spaces', async () => {
      const [client1, client2, client3] = await createInitializedClients(3);
      const sharedWith2 = await client1.spaces.create();
      await inviteMember(sharedWith2, client2);
      const sharedWith3 = await client1.spaces.create();
      await inviteMember(sharedWith3, client3);
      const contacts = await waitForContactBookSize(client1, 2);
      [client2, client3].forEach((c) => expectInContactBook(contacts, c));
    });

    test('everyone is a contact of everyone', async () => {
      const clients = await createInitializedClients(3);
      const [client1, client2, client3] = clients;
      const space = await client1.spaces.create();
      await Promise.all([client2, client3].map((c) => inviteMember(space, c)));
      const checkTasks = clients.map(async (client, idx) => {
        const otherClients = clients.filter((_, anotherIdx) => idx !== anotherIdx);
        const contacts = await waitForContactBookSize(client, 2);
        otherClients.forEach((c) => expectInContactBook(contacts, c));
      });
      await Promise.all(checkTasks);
    });
  });

  const createInitializedClients = async (count: number): Promise<Client[]> => {
    const testBuilder = new TestBuilder();
    const clients = range(
      count,
      () =>
        new Client({
          services: testBuilder.createLocalClientServices(),
        }),
    );
    const initialized = await Promise.all(
      clients.map(async (c, index) => {
        await c.initialize();
        await c.halo.createIdentity({ displayName: `Peer ${index}` });
        return c;
      }),
    );
    onTestFinished(async () => {
      await Promise.all(clients.map((c) => c.destroy()));
    });
    return initialized;
  };

  const expectNoContacts = (client: Client) => expect(client.halo.contacts.get().length).to.eq(0);

  const waitForContactBookSize = async (client: Client, size: number): Promise<Contact[]> => {
    await waitForCondition({ condition: () => client.halo.contacts.get().length === size });
    return client.halo.contacts.get();
  };

  const expectInContactBook = (contacts: Contact[], client: Client) => {
    const contact = contacts.find((c) => c.identityKey.equals(client.halo.identity.get()!.identityKey));
    expect(contact).not.to.be.undefined;
    return contact!;
  };

  const inviteMember = async (host: Space, guest: Client) => {
    const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host, guest: guest.spaces }));
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
  };

  const findSpace = (client: Client, spaceKey: PublicKey) => {
    return client.spaces.get().find((s) => s.key.equals(spaceKey))!;
  };

  const joinSpaceAndCheck = async (host: Space, guest: Client) => {
    expect((await guest.spaces.joinBySpaceKey(host.key)).key.toHex()).to.eq(host.key.toHex());
  };
});
