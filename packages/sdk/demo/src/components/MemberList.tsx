//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Party } from '@dxos/echo-db';
import { usePartyMembers } from '@dxos/react-client';

interface MemberListProps {
  party: Party
}

const MemberList = ({ party }: MemberListProps) => {
  const members: any[] = usePartyMembers(party);

  return (
    <ul>
      {members.map(member => (
        <li key={member.publicKey.humanize()}>{member.displayName ?? member.publicKey.humanize()}</li>
      ))}
    </ul>
  );
};

export default MemberList;
