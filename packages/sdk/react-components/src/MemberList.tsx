//
// Copyright 2020 DXOS.org
//

import { AvatarGroup, Box } from '@mui/material';
import React from 'react';

import { PartyMember } from '@dxos/echo-db';

import { MemberAvatar, ShareButton } from './MemberAvatar';

// TODO(burdon): Move to react-components.

/**
 * List of member avatars.
 */
// TODO(burdon): Rename.
const BasicMemberList = ({ members }: {
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

/**
 * Displays a horizontal list of avataors.
 */
 export const MemberList = ({
  members,
  onShare
}: {
  members: PartyMember[],
  onShare?: () => void
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row'
      }}
    >
      <BasicMemberList members={members} />
      {onShare && ( // TODO(burdon): Break into multiple components.
        <ShareButton onClick={onShare} />
      )}
    </Box>
  );
};
