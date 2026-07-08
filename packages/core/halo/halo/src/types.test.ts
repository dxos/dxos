//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EID, IdentityDid, SpaceId } from '@dxos/keys';

import * as AddressBook from './AddressBook';
import * as Device from './Device';
import * as Group from './Group';
import * as Profile from './Profile';

describe('halo types', () => {
  test('profile', ({ expect }) => {
    const profile = Profile.make({ did: IdentityDid.random(), displayName: 'Alice' });
    expect(Obj.instanceOf(Profile.Profile, profile)).toBe(true);
    expect(profile.displayName).toBe('Alice');
    expect(IdentityDid.isValid(profile.did)).toBe(true);
  });

  test('device', ({ expect }) => {
    const device = Device.make({ did: IdentityDid.random(), label: 'Laptop', kind: 'native' });
    expect(Obj.instanceOf(Device.Device, device)).toBe(true);
    expect(device.kind).toBe('native');
  });

  test('group members addressable by DID and EID', ({ expect }) => {
    const group = Group.make({
      name: 'Team',
      members: [
        { subject: IdentityDid.random(), access: 'admin' },
        { subject: EID.make({ spaceId: SpaceId.random() }), access: 'read' },
      ],
    });
    expect(Obj.instanceOf(Group.Group, group)).toBe(true);
    expect(group.members).toHaveLength(2);
    expect(group.members[0].access).toBe('admin');
  });

  test('address book', ({ expect }) => {
    const profile = Profile.make({ did: IdentityDid.random(), displayName: 'Bob' });
    const addressBook = AddressBook.make({ contacts: [Ref.make(profile)] });
    expect(Obj.instanceOf(AddressBook.AddressBook, addressBook)).toBe(true);
    expect(addressBook.contacts).toHaveLength(1);
  });
});
