//
// Copyright 2020 DXOS.org
//

import React from 'react'

import { Party } from '@dxos/echo-db';

import { usePartyMembers } from '../hooks';

interface MemberListProps {
  party: Party
}

const MemberList = ({ party }: MemberListProps) => {
  const members = usePartyMembers(party);

  return (
    <ul>
      {members.map(member => (
        <li>{member.displayName ?? member.publicKey.humanize()}</li>
      ))}
    </ul>
  );
};

export default MemberList;
