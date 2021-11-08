//
// Copyright 2020 DXOS.org
//

import {
  QrCode2 as QRCodeIcon,
  Clear as CancelIcon
} from '@mui/icons-material';
import { Button, IconButton, Popover, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { useState } from 'react';

import { SecretProvider, generatePasscode } from '@dxos/credentials';
import { InvitationDescriptor, InvitationOptions, PartyMember } from '@dxos/echo-db';
import { encodeInvitation } from '@dxos/react-client';
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
  onCancel: () => void
  invitationCode: string
  pin: string | undefined
}

const PendingInvitation = ({
  invitationCode,
  pin,
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
            Pending invitation (05:00)
          </Typography>
        </>
      )}

      {invitationCode && !pin && (
        <>
          <IconButton size='small'>
            <CopyToClipboard text={invitationCode} />
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
              <QRCode value={invitationCode!} />
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
export const SharingDialog = ({
  open,
  modal,
  title,
  members = [],
  onShare,
  onClose
}: SharingDialogProps) => {
  // TODO(burdon): Expiration.
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const handleCreateInvitation = async () => {
    // Called when otherside joins the invitation party.
    const secretProvider = () => {
      pendingInvitation.pin = generatePasscode();
      setInvitations(invitations => {
        return [...invitations];
      });

      return Promise.resolve(Buffer.from(pendingInvitation.pin));
    };

    const invitation = await onShare({ secretProvider, options: {
      onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
        // Remove the pending invitation.
        setInvitations(invitations => invitations
          .filter(invitation => invitation.invitationCode !== pendingInvitation.invitationCode));
      }
    }});

    const pendingInvitation: PendingInvitation = {
      invitationCode: encodeInvitation(invitation),
      pin: undefined
    };

    setInvitations(invitations => [...invitations, pendingInvitation]);
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
