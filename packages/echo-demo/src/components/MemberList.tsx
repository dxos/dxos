import React from 'react'

import { Party } from "@dxos/echo-db";
import { usePartyMembers } from "../hooks";
import { keyToString } from '@dxos/crypto';

export interface MemberListProps {
  party: Party
}

export const MemberList = ({ party }: MemberListProps) => {
  const members = usePartyMembers(party);

  return (
    <ul>
      {members.map(member => (
        <li>{member.displayName ?? keyToString(member.publicKey)}</li>
      ))}
    </ul>
  )
}
