//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Party, PartyMember } from '@dxos/echo-db';

import { MembersList } from '../components';
import { useMembers } from '../hooks';

/**
 * @deprecated
 */
export const PartyMemberList = ({ party, onShare }: { party: Party, onShare: () => void }) => {
  const members: PartyMember[] = useMembers(party); // TODO(burdon): Pass-in to make dumb component.

  return (
    <MembersList members={members} onShare={onShare} />
  );
};
