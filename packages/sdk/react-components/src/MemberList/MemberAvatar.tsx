//
// Copyright 2020 DXOS.org
//

import React, { ReactElement } from 'react';

import { Face as FaceIcon, Share as ShareIcon } from '@mui/icons-material';
import { Avatar, Tooltip, colors, useTheme } from '@mui/material';

import { PartyMember } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';
import { humanize } from '@dxos/util';

const {
  red,
  pink,
  deepPurple,
  deepOrange,
  indigo,
  blue,
  cyan,
  teal,
  green,
  amber
} = colors;
const depth = 500;

const COLORS = [
  deepOrange[depth],
  deepPurple[depth],
  red[depth],
  pink[depth],
  indigo[depth],
  blue[depth],
  cyan[depth],
  teal[depth],
  green[depth],
  amber[depth]
];

const getColor = (publicKey: PublicKeyLike) =>
  COLORS[parseInt(publicKey.toString('hex').slice(0, 4), 16) % COLORS.length];

// Same size as medium Icon.
const avatarStyles = {
  margin: '5px',
  width: 24,
  height: 24,
  fontSize: 16
};

export const ShareButton = ({ onClick }: { onClick: () => void }) => {
  const theme = useTheme();

  return (
    <Tooltip title='Share' placement='top'>
      <Avatar
        sx={{
          ...avatarStyles,
          border: `2px solid ${theme.palette.background.default}`
        }}
        onClick={onClick}
      >
        <ShareIcon />
      </Avatar>
    </Tooltip>
  );
};

// TODO(burdon): Remove PartyMember dep and create type here.
export const MemberAvatar = ({
  member
}: {
  member?: PartyMember;
}): ReactElement => {
  const theme = useTheme();

  if (!member) {
    return (
      <Avatar sx={avatarStyles}>
        <FaceIcon />
      </Avatar>
    );
  }

  const color = getColor(member.publicKey);
  const name = member.displayName || humanize(member.publicKey.toString());

  return (
    <Tooltip title={name} placement='top'>
      <Avatar
        sx={{
          ...avatarStyles,
          backgroundColor: color,
          color: theme.palette.getContrastText(color)
        }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Avatar>
    </Tooltip>
  );
};
