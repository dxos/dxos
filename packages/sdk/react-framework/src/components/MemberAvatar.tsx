//
// Copyright 2020 DXOS.org
//

import { Face as FaceIcon } from '@mui/icons-material';
import { Avatar as MuiAvatar, Theme, colors, styled } from '@mui/material';
import { StyledComponent } from '@mui/system';
import React, { ReactElement } from 'react';

import { PublicKeyLike } from '@dxos/crypto';
import { PartyMember } from '@dxos/echo-db';

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

interface AvatarProps {
  publicKey?: PublicKeyLike
}

type OwnerState = Record<string, any>

// TODO(burdon): Why is theme passed here?
export const Avatar: StyledComponent<AvatarProps, OwnerState, Theme> = styled(MuiAvatar)(({ publicKey, theme }) => {
  const color = publicKey ? getColor(publicKey) : theme.palette.grey[200];

  return {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    width: `calc(${theme.spacing(4)} - 2px)`,
    height: `calc(${theme.spacing(4)} - 2px)`
  };
});

// TODO(burdon): Remove PartyMember dep and create type here.
export const MemberAvatar = ({ member }: { member?: PartyMember }): ReactElement => (
  <Avatar publicKey={member?.publicKey.asUint8Array()}>
    {member?.displayName ? member.displayName.slice(0, 1).toUpperCase() : <FaceIcon />}
  </Avatar>
);
