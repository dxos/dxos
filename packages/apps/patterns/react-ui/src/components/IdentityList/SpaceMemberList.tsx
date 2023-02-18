//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { SpaceMember } from '@dxos/client';

import { IdentityListItem } from './IdentityListItem';

export interface SpaceMemberListProps {
  spaceMembers: SpaceMember[];
}

export const SpaceMemberList = ({ spaceMembers }: SpaceMemberListProps) => {
  return (
    <ul className='flex flex-col gap-2'>
      {spaceMembers
        .filter((spaceMember) => spaceMember.profile)
        .map((spaceMember) => {
          return (
            <IdentityListItem
              key={spaceMember.identityKey.toHex()}
              identity={spaceMember.profile!}
              presence={spaceMember.presence}
            />
          );
        })}
    </ul>
  );
};
