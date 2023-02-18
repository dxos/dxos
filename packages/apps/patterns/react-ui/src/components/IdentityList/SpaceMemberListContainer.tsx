//
// Copyright 2023 DXOS.org
//
import React, { useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClient, useMembers } from '@dxos/react-client';

import { SpaceMemberList } from './SpaceMemberList';

export interface SpaceMemberListContainerProps {
  spaceKey: PublicKey;
  includeSelf?: boolean;
}

export const SpaceMemberListContainer = ({ spaceKey, includeSelf }: SpaceMemberListContainerProps) => {
  const client = useClient();
  const allUnsortedMembers = useMembers(spaceKey);
  const spaceMembers = useMemo(
    () =>
      includeSelf
        ? allUnsortedMembers.sort((a) => (a.identityKey.equals(client.halo.profile!.identityKey) ? -1 : 1))
        : allUnsortedMembers.filter((member) => !member.identityKey.equals(client.halo.profile!.identityKey)),
    [allUnsortedMembers]
  );
  return <SpaceMemberList spaceMembers={spaceMembers} />;
};
