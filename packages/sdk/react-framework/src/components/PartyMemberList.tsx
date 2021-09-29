//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Theme } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import FaceIcon from '@material-ui/icons/Face';
import ShareIcon from '@material-ui/icons/GroupAdd';
import { AvatarGroup } from '@material-ui/lab';

import { humanize } from '@dxos/crypto';
import { Party, PartyMember } from '@dxos/echo-db';

import { useMembers } from '../hooks';
import { getAvatarStyle } from './MemberAvatar';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row'
  }
}));

// TODO(burdon): Pass in array (small UX data object) of processed members (don't apply humanize here).
const PartyMemberList = ({ party, onShare }: { party: Party, onShare: () => void }) => {
  const classes = useStyles();
  const theme = useTheme() as Theme;
  const members: PartyMember[] = useMembers(party);

  return (
    <div className={classes.root}>
      <AvatarGroup>
        {members.map(member => (
          <Tooltip key={member.publicKey.toString()} title={member.displayName || humanize(member.publicKey.toString())} placement="top">
            <Avatar style={getAvatarStyle(theme, member.publicKey.asUint8Array())} data-testid="avatar">
              {member.displayName ? member.displayName.slice(0, 1).toUpperCase() : <FaceIcon data-testid="face-icon" />}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>

      <Tooltip title="Share" placement="top">
        <Avatar style={getAvatarStyle(theme)} onClick={onShare}>
          <ShareIcon />
        </Avatar>
      </Tooltip>
    </div>
  );
};

export default PartyMemberList;
