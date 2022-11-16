//
// Copyright 2020 DXOS.org
//

import React, { ReactElement } from 'react';

import { Face as FaceIcon, Share as ShareIcon } from '@mui/icons-material';
import { Avatar, Tooltip, colors, useTheme } from '@mui/material';

import { SpaceMember } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

const { red, pink, deepPurple, deepOrange, indigo, blue, cyan, teal, green, amber } = colors;
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

// TODO(burdon): Remove SpaceMember dep and create type here.
export const MemberAvatar = ({ member }: { member?: SpaceMember }): ReactElement => {
  const theme = useTheme();

  if (!member) {
    return (
      <Avatar sx={avatarStyles}>
        <FaceIcon />
      </Avatar>
    );
  }

  const color = getColor(member.identityKey!);
  const letter = member.profile?.displayName?.slice(0, 1).toUpperCase() ?? '?';

  return (
    <Tooltip title={letter} placement='top'>
      <Avatar
        sx={{
          ...avatarStyles,
          backgroundColor: color,
          color: theme.palette.getContrastText(color)
        }}
      >
        {letter}
      </Avatar>
    </Tooltip>
  );
};
