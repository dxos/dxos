//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { SpaceMember } from '@dxos/client';

import { IdentityListItem } from './IdentityListItem';

export interface SpaceMemberListProps {
  members: SpaceMember[];
}

export const SpaceMemberList = ({ members }: SpaceMemberListProps) => {
  return (
    <ul className='flex flex-col gap-2'>
      {members
        .filter((member) => member.profile)
        .map((member) => {
          return (
            <IdentityListItem key={member.identityKey.toHex()} identity={member.profile!} presence={member.presence} />
          );
        })}
    </ul>
  );
};
