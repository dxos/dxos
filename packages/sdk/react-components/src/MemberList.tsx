//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { AvatarGroup, Box } from '@mui/material';

import { PartyMember } from '@dxos/echo-db';

import { MemberAvatar } from './MemberAvatar';

/**
 * List of member avatars.
 */
export const MemberList = ({ members }: {
  members: PartyMember[]
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row'
      }}
    >
      <AvatarGroup>
        {members.map(member => (
          <MemberAvatar key={member.publicKey.toString()} member={member} />
        ))}
      </AvatarGroup>
    </Box>
  );
};
