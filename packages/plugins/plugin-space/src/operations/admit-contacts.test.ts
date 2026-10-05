//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { SpaceMember_Role } from '@dxos/client/echo';
import { type Contact } from '@dxos/client/halo';
import { PublicKey } from '@dxos/keys';
import { InboxAccountRequiredError } from '@dxos/protocols';
import { createBuf, fromPublicKey, requirePublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { Message, SpaceInvitationMessage } from '@dxos/types';

import { admitContacts, sendInvitationMessages } from './admit-contacts.ts';

describe('admitContacts', () => {
  test('admits every key with the role and reports failures without stopping', async () => {
    const [ok1, bad, ok2] = [PublicKey.random(), PublicKey.random(), PublicKey.random()].map((key) => key.toHex());
    const calls: { key: string; role: SpaceMember_Role | undefined }[] = [];
    const space = {
      admitContact: async (contact: Contact, role?: SpaceMember_Role) => {
        const key = requirePublicKey(contact.identityKey).toHex();
        calls.push({ key, role });
        if (key === bad) {
          throw new Error('denied');
        }
      },
    };
    const result = await admitContacts(space, [ok1, bad, ok2], SpaceMember_Role.READER);
    expect(result.admitted).toEqual([ok1, ok2]);
    expect(result.failed).toEqual([{ key: bad, error: 'denied' }]);
    expect(calls.map((call) => call.role)).toEqual([
      SpaceMember_Role.READER,
      SpaceMember_Role.READER,
      SpaceMember_Role.READER,
    ]);
  });

  test('admits a known contact with its profile', async () => {
    const key = PublicKey.random();
    const known = createBuf(ContactSchema, {
      identityKey: fromPublicKey(key),
      profile: createBuf(ProfileDocumentSchema, { displayName: 'Alice' }),
    });
    const admitted: Contact[] = [];
    const space = {
      admitContact: async (contact: Contact) => {
        admitted.push(contact);
      },
    };
    const unknownKey = PublicKey.random();
    await admitContacts(space, [key.toHex().toUpperCase(), unknownKey.toHex()], SpaceMember_Role.EDITOR, [known]);
    expect(admitted.map((contact) => requirePublicKey(contact.identityKey).toHex())).toEqual([
      key.toHex(),
      unknownKey.toHex(),
    ]);
    expect(admitted.map((contact) => contact.profile?.displayName)).toEqual(['Alice', undefined]);
  });
});

describe('sendInvitationMessages', () => {
  test('sends one invitation message per admitted key and reports failures without throwing', async () => {
    const spaceKey = PublicKey.random();
    const [ok, bad, accountless] = [PublicKey.random(), PublicKey.random(), PublicKey.random()].map((key) =>
      key.toHex(),
    );
    const requests: InboxService.SendMessageRequest[] = [];
    const inbox = {
      sendMessage: async (request: InboxService.SendMessageRequest) => {
        requests.push(request);
        if (request.recipientIdentityKey.toHex() === bad) {
          throw new Error('offline');
        }
        if (request.recipientIdentityKey.toHex() === accountless) {
          throw new InboxAccountRequiredError();
        }
      },
    };
    const result = await sendInvitationMessages(inbox, {
      sender: { identityDid: 'did:halo:alice' },
      spaceKey,
      spaceName: 'Plans',
      identityKeys: [ok, bad, accountless],
      role: SpaceMember_Role.EDITOR,
    });
    expect(result).toEqual({
      sent: [ok],
      failed: [
        { key: bad, reason: 'send-failed' },
        { key: accountless, reason: 'account-required' },
      ],
    });
    expect(requests.map((request) => request.recipientIdentityKey.toHex())).toEqual([ok, bad, accountless]);
    expect(requests.every((request) => request.type === InboxService.INBOX_MESSAGE_TYPE)).toBe(true);

    const message = Option.getOrThrow(Message.decodeJson(requests[0].payload));
    expect(message.sender.identityDid).toBe('did:halo:alice');
    expect(Option.getOrThrow(SpaceInvitationMessage.match(message))).toEqual({
      spaceKey: spaceKey.toHex(),
      role: SpaceMember_Role.EDITOR,
      spaceName: 'Plans',
    });
  });
});
