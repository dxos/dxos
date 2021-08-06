//
// Copyright 2021 DXOS.org
//

import moment from 'moment';
import React, { useState, useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { makeStyles, TableRow, IconButton } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import DeleteIcon from '@material-ui/icons/Clear';
import FaceIcon from '@material-ui/icons/Face';
import LinkIcon from '@material-ui/icons/Link';
import { useTheme } from '@material-ui/styles';

import { Party } from '@dxos/echo-db';
import { useInvitation } from '@dxos/react-client';

import { getAvatarStyle } from './MemberAvatar';
import TableCell from './TableCell';

const getInvitationStatus = (invitation: Record<string, any>) => {
  if (invitation.done) {
    return 'Done';
  }
  if (invitation.expiration) {
    return `Expires ${moment(invitation.expiration).fromNow(false)}`;
  }
  return 'Pending';
};

const useStyles = makeStyles((theme) => ({
  label: {
    fontVariant: 'all-small-caps'
  },
  passcode: {
    marginLeft: theme.spacing(1),
    padding: theme.spacing(1),
    border: `2px solid ${theme.palette.primary.dark}`
  },
  colAvatar: {
    width: 60
  },
  colPasscode: {
    width: 160
  },
  colStatus: {
    width: 150
  },
  colActions: {
    width: 60,
    textAlign: 'right'
  }
}));

function PendingInvitation ({
  party,
  pending,
  invitationName,
  handleCopy,
  onInvitationDone,
  onRenew
}: {
  party: Party;
  pending: Record<string, any>;
  invitationName: string;
  handleCopy: (value: string) => void;
  onInvitationDone: (value: string) => void;
  onRenew?: () => void;
}) {
  const classes = useStyles();
  const [expired, setExpired] = useState(false);
  const [status, setStatus] = useState(getInvitationStatus(pending));

  useEffect(() => {
    const interval = setInterval(() => setStatus(getInvitationStatus(pending)), 1000);
    return () => clearInterval(interval);
  }, []);

  const [inviteCode, pin] = useInvitation(party.key, {
    onDone: () => {
      onInvitationDone(pending.id);
    },
    onError: (e: any) => {
      throw e;
    },
    onExpiration: pending.expiration
      ? () => {
          setExpired(true);
        }
      : undefined,
    expiration: pending.expiration
  });

  return (
    <TableRow>
      <TableCell classes={{ root: classes.colAvatar }}>
        <Avatar style={getAvatarStyle(useTheme())}>
          <FaceIcon />
        </Avatar>
      </TableCell>
      <TableCell>{invitationName}</TableCell>
      <TableCell classes={{ root: classes.colPasscode }}>
        {pin && (
          <>
            <span className={classes.label}>Passcode</span>
            <span className={classes.passcode}>{pin}</span>
          </>
        )}
      </TableCell>
      <TableCell classes={{ root: classes.colStatus }}>
        <span className={classes.label}>{expired ? 'Expired' : status}</span>
      </TableCell>
      <TableCell classes={{ root: classes.colActions }}>
        {expired && onRenew && (
          <IconButton size='small' color='inherit' title='Regenerate' edge='start' onClick={onRenew}>
            <AutorenewIcon />
          </IconButton>
        )}
        {!expired && !pin && (
          <>
            <CopyToClipboard text={inviteCode} onCopy={handleCopy}>
              <IconButton
                size='small'
                color='inherit'
                aria-label='copy to clipboard'
                title='Copy to clipboard'
                edge='start'
              >
                <LinkIcon />
              </IconButton>
            </CopyToClipboard>
          </>
        )}
        {expired && (
          <IconButton
            size='small'
            color='inherit'
            title='Remove'
            edge='start'
            onClick={() => onInvitationDone(pending.id)}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}

export default PendingInvitation;
