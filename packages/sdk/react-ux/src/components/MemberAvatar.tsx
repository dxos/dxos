//
// Copyright 2020 DXOS.org
//

import React, { ReactElement } from 'react';

import { Theme } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import { red, pink, deepPurple, deepOrange, indigo, blue, cyan, teal, green, amber } from '@material-ui/core/colors';
import FaceIcon from '@material-ui/icons/Face';
import { useTheme } from '@material-ui/styles';

import { PublicKeyLike } from '@dxos/crypto';
import { PartyMember } from '@dxos/echo-db';

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
  amber[depth],
];

const getColor = (publicKey: PublicKeyLike) =>
  COLORS[parseInt(publicKey.toString('hex').slice(0, 4), 16) % COLORS.length];

export const getAvatarStyle = (theme: Theme, publicKey?: PublicKeyLike): Record<string, unknown> => {
  const color = publicKey ? getColor(publicKey) : theme.palette.grey[200];
  return {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    width: theme.spacing(4) - 2,
    height: theme.spacing(4) - 2,
  };
};

const MemberAvatar = ({ member }: { member: PartyMember }): ReactElement => (
  <Avatar style={getAvatarStyle(useTheme(), member.publicKey.asUint8Array())}>
    {member.displayName ? member.displayName.slice(0, 1).toUpperCase() : <FaceIcon />}
  </Avatar>
);

export default MemberAvatar;
