//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { SpaceMember } from '@dxos/client/echo';

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
  FormBuilder.make({ title: member.identity.profile?.displayName ?? member.identity.identityKey.truncate() }).pipe(
    FormBuilder.set('identityKey', member.identity.identityKey.truncate()),
    FormBuilder.set('displayName', member.identity.profile?.displayName ?? '<none>'),
    FormBuilder.set('presence', member.presence === SpaceMember.PresenceState.ONLINE ? 'Online' : 'Offline'),
    FormBuilder.build,
  );

export const printMembers = (members: SpaceMember[]) => {
  return members.map(printMember);
};
