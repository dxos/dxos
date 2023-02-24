//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { AvatarGroup, Box } from '@mui/material';

import { SpaceMember } from '@dxos/client';

import { MemberAvatar } from './MemberAvatar';

/**
 * List of member avatars.
 */
export const MemberList = ({ members }: { members: SpaceMember[] }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'row'
    }}
  >
    <AvatarGroup>
      {members.map((member) => (
        <MemberAvatar key={member.identity.identityKey?.toHex()} member={member} />
      ))}
    </AvatarGroup>
  </Box>
);
