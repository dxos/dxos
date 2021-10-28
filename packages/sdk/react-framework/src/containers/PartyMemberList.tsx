//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Party, PartyMember } from '@dxos/echo-db';

import { MemberList } from '../components';
import { useMembers } from '../hooks';

/**
 * @deprecated
 */
export const PartyMemberList = ({
  party,
  onShare
}: {
  party: Party,
  onShare: () => void
}) => {
  // TODO(burdon): Pass-in to make dumb component.
  const members: PartyMember[] = useMembers(party);

  return (
    <MemberList
      members={members}
      onShare={onShare}
    />
  );
};
