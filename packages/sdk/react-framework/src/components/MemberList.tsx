//
// Copyright 2020 DXOS.org
//

import { Share as ShareIcon } from '@mui/icons-material';
import { AvatarGroup, Box, Tooltip, Theme, useTheme } from '@mui/material';
import React from 'react';

import { humanize } from '@dxos/crypto';
import { Party, PartyMember } from '@dxos/echo-db';

import { useMembers } from '../hooks';
import { Avatar, MemberAvatar } from './MemberAvatar';

/**
 * Displays a horizontal list of avataors.
 */
export const MemberList = ({
  members,
  onShare
}: {
  members: PartyMember[],
  onShare: () => void
}) => {
  const theme = useTheme() as Theme;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row'
      }}
    >
      <AvatarGroup>
        {members.map(member => (
          <Tooltip
            key={member.publicKey.toString()}
            title={member.displayName || humanize(member.publicKey.toString())}
            placement='top'
          >
            <MemberAvatar member={member} />
          </Tooltip>
        ))}
      </AvatarGroup>

      <Tooltip title='Share' placement='top'>
        <Avatar theme={theme} onClick={onShare}>
          <ShareIcon />
        </Avatar>
      </Tooltip>
    </Box>
  );
};

/**
 * @deprecated
 */
export const PartyMemberList = ({
  party,
  onShare
}: {
  party: Party,
  onShare: () => void
}) => {
  // TODO(burdon): Pass-in to make dumb component.
  const members: PartyMember[] = useMembers(party);

  return (
    <MemberList
      members={members}
      onShare={onShare}
    />
  );
}
