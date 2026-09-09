//
// Copyright 2025 DXOS.org
//

import { Doc, FormBuilder } from '@dxos/cli-util';
import { type SpaceMember, SpaceMember_PresenceState } from '@dxos/client/echo';
import { requirePublicKey } from '@dxos/protocols/buf';

const maybeTruncateKey = (key: { toHex(): string; truncate(): string }, truncate = false) =>
  truncate ? key.truncate() : key.toHex();

export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(requirePublicKey(member.identity?.identityKey), truncateKeys),
    name: member.identity?.profile?.displayName,
    presence: member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline',
  }));
};

export const printMember = (member: SpaceMember): Doc.Doc<any> => {
  const identityKey = requirePublicKey(member.identity?.identityKey);
  return FormBuilder.make({ title: member.identity?.profile?.displayName ?? identityKey.truncate() }).pipe(
    FormBuilder.set('identityKey', identityKey.truncate()),
    FormBuilder.set('displayName', member.identity?.profile?.displayName ?? '<none>'),
    FormBuilder.set('presence', member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline'),
    FormBuilder.build,
  );
};

export const printMembers = (members: SpaceMember[]) => {
  return members.map(printMember);
};
