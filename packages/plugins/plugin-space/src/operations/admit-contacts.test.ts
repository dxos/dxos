//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SpaceMember_Role } from '@dxos/client/echo';
import { type Contact } from '@dxos/client/halo';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey, requirePublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { admitContacts } from './admit-contacts.ts';

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
    await admitContacts(space, [key.toHex(), PublicKey.random().toHex()], SpaceMember_Role.EDITOR, [known]);
    expect(admitted.map((contact) => contact.profile?.displayName)).toEqual(['Alice', undefined]);
  });
});
