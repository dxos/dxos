//
// Copyright 2020 DXOS.org
//

import React, { Dispatch, SetStateAction, useState } from 'react';
import { CopyToClipboard as Clipboard } from 'react-copy-to-clipboard';
import urlJoin from 'url-join';

import {
  Clear as CancelIcon, QrCode2 as QRCodeIcon
} from '@mui/icons-material';
import { Button, IconButton, Popover, Typography } from '@mui/material';
import { Box } from '@mui/system';

import type { PendingInvitation } from '@dxos/client';
import { PartyMember } from '@dxos/echo-db';
import {
  CopyToClipboard, Dialog, HashIcon, MemberList, Passcode, QRCode
} from '@dxos/react-components';

import { usePendingInvitations } from '../hooks';

interface PendingInvitationProps {
  invitationCode: string
  pin: string | undefined
  createUrl: (invitationCode: string) => string
  onCancel: () => void
}

const PendingInvitationView = ({
  invitationCode,
  pin,
  createUrl,
  onCancel
}: PendingInvitationProps) => {
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <Box sx={{
      display: 'flex',
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      {invitationCode && (
        <>
          <Clipboard text={pin || ''}>
            <IconButton size='small'>
              <HashIcon value={invitationCode} />
            </IconButton>
          </Clipboard>
          <Clipboard text={invitationCode}>
            <Typography sx={{ flex: 1, marginLeft: 2, marginRight: 2 }}>
              Pending invitation...
            </Typography>
          </Clipboard>
        </>
      )}

      {invitationCode && !pin && (
        <>
          <IconButton size='small' title='Copy invitation.'>
            <CopyToClipboard text={createUrl(invitationCode)} />
          </IconButton>
          <IconButton
            size='small'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => setPopoverAnchor(event.currentTarget)}
          >
            <QRCodeIcon />
          </IconButton>
          <Popover
            open={Boolean(popoverAnchor)}
            anchorEl={popoverAnchor}
            anchorOrigin={{
              vertical: 'center',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'center',
              horizontal: 'left'
            }}
            onClose={() => setPopoverAnchor(null)}
          >
            <Box sx={{ padding: 1 }}>
              <QRCode value={createUrl(invitationCode)} />
            </Box>
          </Popover>
        </>
      )}

      {pin && (
        <>
          <IconButton size='small' title='Copy passcode.'>
            <CopyToClipboard text={pin} />
          </IconButton>
          <Passcode
            disabled
            size='small'
            value={pin}
          />
        </>
      )}

      {invitationCode && (
        <IconButton size='small' onClick={onCancel}>
          <CancelIcon />
        </IconButton>
      )}
    </Box>
  );
};

const defaultCreateUrl = (invitationCode: string) => {
  // TODO(burdon): By-pass keyhole with fake code.
  const kubeCode = [...new Array(6)].map(() => Math.floor(Math.random() * 10)).join('');
  const invitationPath = `/invitation/${invitationCode}`; // App-specific.
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `?code=${kubeCode}`, `/#${invitationPath}`);
};

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  title: string,
  members?: PartyMember[] // TODO(rzadp): Support HALO members as well (different devices).
  onCreateInvitation: (setInvitations: Dispatch<SetStateAction<PendingInvitation[]>>) => () => (void | Promise<void>)
  onClose?: () => void
  createUrl?: (invitationCode: string) => string
}

/**
 * Reusable sharing logic for inviting to a regular party and to a HALO party.
 * Not exported for the end user.
 * See PartySharingDialog and DeviceSharingDialog.
 */
// TODO(burdon): Rename AccessDialog?
export const SharingDialog = ({
  open,
  modal,
  title,
  members = [],
  createUrl = defaultCreateUrl,
  onCreateInvitation,
  onClose
}: SharingDialogProps) => {
  const [invitations, setInvitations] = usePendingInvitations();

  const handleCreateInvitation = onCreateInvitation(setInvitations);

  return (
    <Dialog
      open={open}
      modal={modal}
      title={title}
      content={(
        <>
          <Box>
            <Button onClick={handleCreateInvitation}>Create Invitation</Button>
          </Box>

          <Box sx={{
            display: 'flex',
            flex: 1,
            padding: 1,
            flexDirection: 'column',
            maxHeight: 5 * 40,
            overflow: 'auto'
          }}>
            {invitations.map(({ invitationCode, pin }, i) => (
              <PendingInvitationView
                key={i}
                invitationCode={invitationCode}
                pin={pin}
                createUrl={createUrl}
                onCancel={() => {
                  invitations.splice(i, 1);
                  setInvitations([...invitations]);
                }}
              />
            ))}
          </Box>

          <Box sx={{ marginTop: 2 }}>
            {/* TODO(burdon): Invite from address book. */}
            <MemberList members={members} />
          </Box>
        </>
      )}
      actions={(
        <Button onClick={onClose}>Close</Button>
      )}
    />
  );
};
