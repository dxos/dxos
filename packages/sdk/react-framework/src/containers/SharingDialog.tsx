//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';
import { CopyToClipboard as Clipboard } from 'react-copy-to-clipboard';
import urlJoin from 'url-join';

import {
  QrCode2 as QRCodeIcon,
  Clear as CancelIcon
} from '@mui/icons-material';
import { Button, IconButton, Popover, Typography } from '@mui/material';
import { Box } from '@mui/system';

import { encodeInvitation } from '@dxos/client';
import { SecretProvider, generatePasscode } from '@dxos/credentials';
import { InvitationDescriptor, InvitationOptions, PartyMember } from '@dxos/echo-db';
import {
  CopyToClipboard, Dialog, HashIcon, MemberList, Passcode, QRCode
} from '@dxos/react-components';

import { PendingInvitation, usePendingInvitations } from '../hooks';

type ShareOptions = {
  secretProvider: SecretProvider
  options: InvitationOptions
}

interface PendingInvitationProps {
  invitationCode: string
  pin: string | undefined
  createUrl: (invitationCode: string) => string
  onCancel: () => void
}

const PendingInvitation = ({
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
          <Typography sx={{ flex: 1, marginLeft: 2, marginRight: 2 }}>
            Pending invitation...
          </Typography>
        </>
      )}

      {invitationCode && !pin && (
        <>
          <IconButton size='small' title='Copy passcode.'>
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
        <Passcode size='small' value={pin} />
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
  return urlJoin(origin, pathname, `/?code=${kubeCode}`, `/#${invitationPath}`)
    .replace('?', '/?'); // TODO(burdon): Slash needed.
};

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  title: string,
  members?: PartyMember[] // TODO(rzadp): Support HALO members as well (different devices).
  onShare: (shareOptions: ShareOptions) => Promise<InvitationDescriptor>
  onCreateInvitation?: () => Promise<PendingInvitation>
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
  onShare,
  onCreateInvitation,
  onClose
}: SharingDialogProps) => {
  const [invitations, setInvitations] = usePendingInvitations();

  // The old way - before the migration to new Client API with Client Services.
  const createLocalInvitation = async () => {
    let pendingInvitation: PendingInvitation; // eslint-disable-line prefer-const

    // Called when other side joins the invitation party.
    const secretProvider = () => {
      pendingInvitation.pin = generatePasscode();
      setInvitations(invitations => [...invitations]);
      return Promise.resolve(Buffer.from(pendingInvitation.pin));
    };

    const invitation = await onShare({
      secretProvider,
      options: {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
        // Remove the pending invitation.
          setInvitations(invitations => invitations
            .filter(invitation => invitation.invitationCode !== pendingInvitation.invitationCode));
        }
      }
    });

    pendingInvitation = {
      invitationCode: encodeInvitation(invitation),
      pin: undefined // Generated above.
    };

    return pendingInvitation;
  };

  const handleCreateInvitation = async () => {
    const pendingInvitation = await (onCreateInvitation ?? createLocalInvitation)()
    setInvitations(invitations => [...invitations, pendingInvitation]);
  }

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
              <PendingInvitation
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
