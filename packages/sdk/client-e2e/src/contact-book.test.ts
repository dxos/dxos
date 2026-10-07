//
// Copyright 2021 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Option from 'effect/Option';
import { describe, expect, onTestFinished, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { Client } from '@dxos/client';
import type { Space } from '@dxos/client-protocol';
import { MemoryEdgeInbox } from '@dxos/client-services/testing';
import { SpaceMember_Role } from '@dxos/client/echo';
import { TestBuilder, TestSchema, performInvitation, waitForSpace } from '@dxos/client/testing';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type Contact } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { Message, SpaceInvitationMessage } from '@dxos/types';
import { range } from '@dxos/util';

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

      await client1.addTypes([TestSchema.TextV0Type]);
      const space2 = await client1.spaces.create();
      const document = space2.db.add(Obj.make(TestSchema.TextV0Type, { content: 'text' }));
      await space2.db.flush();

      await space2.admitContact(contact);
      await joinSpaceAndCheck(space2, client2);
      const guestSpace = await waitForSpace(client2, space2.key, { ready: true });
      await expectDocumentReplicated(guestSpace, document);

      Obj.update(document, (document) => {
        document.content = 'Hello, world!';
      });
      await space2.db.flush();
      await expectDocumentReplicated(guestSpace, document);
    });

    test('admits with the requested role', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);
      const space2 = await client1.spaces.create();
      await space2.admitContact(contact, SpaceMember_Role.READER);
      await joinSpaceAndCheck(space2, client2);
      expect(memberRole(space2, client2)).to.eq(SpaceMember_Role.READER);
    });

    test('delivers an invitation message through the inbox relay', async () => {
      const inboxRelay = new MemoryEdgeInbox();
      const [client1, client2] = await createInitializedClients(2, { inboxRelay });
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);
      const space2 = await client1.spaces.create();
      await space2.admitContact(contact);

      const sender = client1.halo.identity.get();
      invariant(sender);
      await client1.halo.inbox.sendMessage({
        recipientIdentityKey: requirePublicKey(contact.identityKey),
        type: InboxService.INBOX_MESSAGE_TYPE,
        payload: Message.encodeJson(
          SpaceInvitationMessage.make({
            sender: { identityDid: sender.did },
            spaceKey: space2.key.toHex(),
            role: SpaceMember_Role.EDITOR,
          }),
        ),
      });

      await waitForCondition({ condition: () => client2.halo.inbox.messages.get().length === 1 });
      const [message] = client2.halo.inbox.messages.get();
      expect(message.senderIdentityKey.toHex()).to.eq(requirePublicKey(sender.identityKey).toHex());
      const invitation = Option.getOrThrow(
        SpaceInvitationMessage.match(Option.getOrThrow(Message.decodeJson(message.payload))),
      );
      expect(invitation.spaceKey).to.eq(space2.key.toHex());

      // The message is only a pointer: the admission is what lets the recipient join.
      const joined = await client2.spaces.joinBySpaceKey(PublicKey.from(invitation.spaceKey));
      expect(joined.key.toHex()).to.eq(space2.key.toHex());
    });

    test('admits as editor by default', async () => {
      const [client1, client2] = await createInitializedClients(2);
      const space1 = await client1.spaces.create();
      await inviteMember(space1, client2);
      const [contact] = await waitForContactBookSize(client1, 1);
      const space2 = await client1.spaces.create();
      await space2.admitContact(contact);
      await joinSpaceAndCheck(space2, client2);
      expect(memberRole(space2, client2)).to.eq(SpaceMember_Role.EDITOR);
    });
  });

  const expectDocumentReplicated = async (space: Space, expected: TestSchema.TextV0Type) => {
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
      expect(client1.halo.contacts.get().length).to.eq(0);
      await inviteMember(space, client2);
      const contacts = await waitForContactBookSize(client1, 1);
      const contact = expectInContactBook(contacts, client2);
      expect(contact.did).to.eq(client2.halo.identity.get()?.did);
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
      expect(contact.commonSpaces?.map((k) => requirePublicKey(k).toHex()).sort()).to.deep.eq(expectedSpaces);
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

  const createInitializedClients = async (
    count: number,
    options?: Parameters<TestBuilder['createLocalClientServices']>[0],
  ): Promise<Client[]> => {
    const testBuilder = new TestBuilder();
    const clients = range(
      count,
      () =>
        new Client({
          services: testBuilder.createLocalClientServices(options),
        }),
    );
    const initialized = await Promise.all(
      clients.map(async (c, index) => {
        await c.initialize();
        await c.halo.createIdentity(create(ProfileDocumentSchema, { displayName: `Peer ${index}` }));
        return c;
      }),
    );
    onTestFinished(async () => {
      await Promise.all(clients.map((c) => c.destroy()));
    });
    return initialized;
  };

  const waitForContactBookSize = async (client: Client, size: number): Promise<Contact[]> => {
    await waitForCondition({ condition: () => client.halo.contacts.get().length === size });
    return client.halo.contacts.get();
  };

  const expectInContactBook = (contacts: Contact[], client: Client) => {
    const contact = contacts.find((c) =>
      toPublicKey(c.identityKey)?.equals(requirePublicKey(client.halo.identity.get()!.identityKey)),
    );
    expect(contact).not.to.be.undefined;
    return contact!;
  };

  const inviteMember = async (host: Space, guest: Client) => {
    const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host, guest: guest.spaces }));
    expect(hostInvitation?.state).to.eq(Invitation_State.SUCCESS);
  };

  const findSpace = (client: Client, spaceKey: PublicKey) => {
    return client.spaces.get().find((s) => s.key.equals(spaceKey))!;
  };

  const memberRole = (space: Space, client: Client) => {
    const identityKey = requirePublicKey(client.halo.identity.get()?.identityKey);
    return space.members.get().find((member) => toPublicKey(member.identity?.identityKey)?.equals(identityKey))?.role;
  };

  const joinSpaceAndCheck = async (host: Space, guest: Client) => {
    expect((await guest.spaces.joinBySpaceKey(host.key)).key.toHex()).to.eq(host.key.toHex());
  };
});
