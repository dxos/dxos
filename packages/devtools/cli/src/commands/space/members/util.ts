//
// Copyright 2025 DXOS.org
//

import { SpaceMember } from '@dxos/client/echo';

import { FormBuilder } from '../../../util';

const maybeTruncateKey = (key: { toHex(): string; truncate(): string }, truncate = false) =>
  truncate ? key.truncate() : key.toHex();

export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identity.identityKey, truncateKeys),
    name: member.identity.profile?.displayName,
    presence: member.presence === SpaceMember.PresenceState.ONLINE ? 'Online' : 'Offline',
  }));
};

export const printMember = (member: SpaceMember) =>
  FormBuilder.of({ title: member.identity.profile?.displayName ?? member.identity.identityKey.truncate() })
    .set({ key: 'identityKey', value: member.identity.identityKey.truncate() })
    .set({ key: 'displayName', value: member.identity.profile?.displayName ?? '<none>' })
    .set({ key: 'presence', value: member.presence === SpaceMember.PresenceState.ONLINE ? 'Online' : 'Offline' })
    .build();

export const printMembers = (members: SpaceMember[]) => {
  return members.map(printMember);
};
