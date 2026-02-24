//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { type SpaceMember } from '@dxos/client/echo';
import { SpaceMember_PresenceState } from '@dxos/protocols/buf/dxos/client/services_pb';

const maybeTruncateKey = (key: unknown, truncate = false) =>
  key ? (truncate ? (key as any).truncate() : (key as any).toHex()) : '';

export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identity?.identityKey, truncateKeys),
    name: member.identity?.profile?.displayName,
    presence: member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline',
  }));
};

export const printMember = (member: SpaceMember) =>
  FormBuilder.make({
    title: member.identity?.profile?.displayName ?? (member.identity?.identityKey as any)?.truncate() ?? '<unknown>',
  }).pipe(
    FormBuilder.set('identityKey', (member.identity?.identityKey as any)?.truncate() ?? ''),
    FormBuilder.set('displayName', member.identity?.profile?.displayName ?? '<none>'),
    FormBuilder.set('presence', member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline'),
    FormBuilder.build,
  );

export const printMembers = (members: SpaceMember[]) => {
  return members.map(printMember);
};
