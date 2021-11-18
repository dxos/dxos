//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

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

type ShareOptions = {
  secretProvider: SecretProvider
  options: InvitationOptions
}

type PendingInvitation = {
  invitationCode: string
  pin: string | undefined
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
          <HashIcon value={invitationCode} />
          <Typography sx={{ flex: 1, marginLeft: 2, marginRight: 2 }}>
            Pending invitation...
          </Typography>
        </>
      )}

      {invitationCode && !pin && (
        <>
          <IconButton size='small'>
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

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  title: string,
  members?: PartyMember[] // TODO(rzadp): Support HALO members as well (different devices).
  onShare: (shareOptions: ShareOptions) => Promise<InvitationDescriptor>
  onClose?: () => void
}

/**
 * Reusable sharing logic for inviting to a regular party and to a HALO party.
 * Not exported for the end user.
 * See PartySharingDialog and DeviceSharingDialog.
 */
// TODO(burdon): Move to components.
export const SharingDialog = ({
  open,
  modal,
  title,
  members = [],
  onShare,
  onClose
}: SharingDialogProps) => {
  // TODO(burdon): Add to context (make persistent when closing dialog).
  // TODO(burdon): Expiration.
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const handleCreateInvitation = async () => {
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

    setInvitations(invitations => [...invitations, pendingInvitation]);
  };

  const createUrl = (invitationCode: string) => {
    // TODO(burdon): By-pass keyhole with fake code.
    const kubeCode = [...new Array(6)].map(() => Math.floor(Math.random() * 10)).join('');
    const invitationPath = `/invitation/${invitationCode}`; // TODO(burdon): App-specific (hence pass in).
    const { origin, pathname } = window.location;
    return `${origin}${pathname}?code=${kubeCode}/#${invitationPath}`; // TODO(burdon): Use URL concat util?
  };

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
