//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { contactDisplayName, contactKeyHex, filterContacts } from './ContactList.tsx';

const makeContact = (displayName?: string) =>
  create(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    profile: displayName ? create(ProfileDocumentSchema, { displayName }) : undefined,
  });

describe('filterContacts', () => {
  test('matches display name case-insensitively', () => {
    const alice = makeContact('Alice');
    expect(filterContacts([alice, makeContact('Bob')], 'ali')).toEqual([alice]);
  });

  test('matches identity key hex', () => {
    const bob = makeContact('Bob');
    const hex = contactKeyHex(bob).slice(0, 8);
    expect(filterContacts([makeContact('Alice'), bob], hex)).toEqual([bob]);
  });

  test('empty filter returns all', () => {
    const contacts = [makeContact('A'), makeContact('B')];
    expect(filterContacts(contacts, '')).toEqual(contacts);
  });

  test('falls back to a generated name', () => {
    expect(contactDisplayName(makeContact())).not.toEqual('');
  });
});
