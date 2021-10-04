//
// Copyright 2020 DXOS.org
//

import { Share as ShareIcon } from '@mui/icons-material';
import { AvatarGroup } from '@mui/lab';
import { styled, Tooltip, Theme, useTheme } from '@mui/material';
import React from 'react';

import { humanize } from '@dxos/crypto';
import { Party, PartyMember } from '@dxos/echo-db';

import { useMembers } from '../hooks';
import { Avatar, MemberAvatar } from './MemberAvatar';

const Root = styled('div')({
  display: 'flex',
  flexDirection: 'row'
});

// TODO(burdon): Pass in array (small UX data object) of processed members (don't apply humanize here).
export const PartyMemberList = ({ party, onShare }: { party: Party, onShare: () => void }) => {
  const theme = useTheme() as Theme;
  const members: PartyMember[] = useMembers(party);

  return (
    <Root>
      <AvatarGroup>
        {members.map(member => (
          <Tooltip key={member.publicKey.toString()} title={member.displayName || humanize(member.publicKey.toString())} placement="top">
            <MemberAvatar member={member} />
          </Tooltip>
        ))}
      </AvatarGroup>

      <Tooltip title="Share" placement="top">
        <Avatar theme={theme} onClick={onShare}>
          <ShareIcon />
        </Avatar>
      </Tooltip>
    </Root>
  );
};
