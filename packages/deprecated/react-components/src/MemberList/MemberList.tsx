//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { AvatarGroup, Box } from '@mui/material';

import { PartyMember } from '@dxos/client';

import { MemberAvatar } from './MemberAvatar';

/**
 * List of member avatars.
 */
export const MemberList = ({ members }: { members: PartyMember[] }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'row'
    }}
  >
    <AvatarGroup>
      {members.map((member) => (
        <MemberAvatar key={member.identityKey?.toHex()} member={member} />
      ))}
    </AvatarGroup>
  </Box>
);
