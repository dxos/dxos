//
// Copyright 2023 DXOS.org
//
import React, { useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { SpaceMember, useClient, useMembers } from '@dxos/react-client';

import { SpaceMemberList } from './SpaceMemberList';

export interface SpaceMemberListContainerProps {
  spaceKey: PublicKey;
  includeSelf?: boolean;
  onSelect?: (member: SpaceMember) => void;
}

export const SpaceMemberListContainer = ({ spaceKey, includeSelf, onSelect }: SpaceMemberListContainerProps) => {
  const client = useClient();
  const allUnsortedMembers = useMembers(spaceKey);
  const members = useMemo(
    () =>
      includeSelf
        ? allUnsortedMembers.sort((a) =>
            a.identity.identityKey.equals(client.halo.identity.get()!.identityKey) ? -1 : 1,
          )
        : allUnsortedMembers.filter(
            (member) => !member.identity.identityKey.equals(client.halo.identity.get()!.identityKey),
          ),
    [allUnsortedMembers],
  );
  return <SpaceMemberList members={members} onSelect={onSelect} />;
};
