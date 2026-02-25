//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';
import { decodePublicKey } from '@dxos/protocols/buf';
import { type SpaceMember } from '@dxos/client/echo';
import { SpaceMember_PresenceState } from '@dxos/protocols/buf/dxos/client/services_pb';

const maybeTruncateKey = (key: { data: Uint8Array } | null | undefined, truncate = false) =>
  key ? (truncate ? decodePublicKey(key).truncate() : decodePublicKey(key).toHex()) : '';

export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identity?.identityKey, truncateKeys),
    name: member.identity?.profile?.displayName,
    presence: member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline',
  }));
};

export const printMember = (member: SpaceMember) =>
  FormBuilder.make({
    title: member.identity?.profile?.displayName ?? (member.identity?.identityKey ? decodePublicKey(member.identity.identityKey).truncate() : undefined) ?? '<unknown>',
  }).pipe(
    FormBuilder.set('identityKey', member.identity?.identityKey ? decodePublicKey(member.identity.identityKey).truncate() : ''),
    FormBuilder.set('displayName', member.identity?.profile?.displayName ?? '<none>'),
    FormBuilder.set('presence', member.presence === SpaceMember_PresenceState.ONLINE ? 'Online' : 'Offline'),
    FormBuilder.build,
  );

export const printMembers = (members: SpaceMember[]) => {
  return members.map(printMember);
};
