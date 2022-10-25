//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Clear as CancelIcon,
  QrCode2 as QRCodeIcon
} from '@mui/icons-material';
import { Box, IconButton, Popover, Typography } from '@mui/material';

import {
  CopyToClipboard,
  HashIcon,
  Passcode,
  QRCode
} from '@dxos/react-components';

export interface PendingInvitationProps {
  invitationCode: string;
  pin: string | undefined;
  createUrl: (invitationCode: string) => string;
  onCancel: () => void;
}

/**
 * Displays the pending invitation row, invitaion/cancel buttons, etc.
 * @param invitationCode
 * @param pin
 * @param createUrl
 * @param onCancel
 * @constructor
 */
export const PendingInvitation = ({
  invitationCode,
  pin,
  createUrl,
  onCancel
}: PendingInvitationProps) => {
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLButtonElement | null>(
    null
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 40
      }}
    >
      <IconButton size='small' disabled>
        <HashIcon value={invitationCode} />
      </IconButton>

      {/* TODO(burdon): Show expiration time. */}
      <Typography
        sx={{ flex: 1, marginLeft: 2, marginRight: 2, whiteSpace: 'nowrap' }}
      >
        {!pin ? 'Waiting...' : 'Passcode'}
      </Typography>

      {!pin && (
        <>
          <IconButton size='small' title='Copy invitation.'>
            <CopyToClipboard text={createUrl(invitationCode)} />
          </IconButton>
          <IconButton
            size='small'
            onClick={(event) => setPopoverAnchor(event.currentTarget)}
          >
            <QRCodeIcon />
          </IconButton>
          <Popover
            open={Boolean(popoverAnchor)}
            onClose={() => setPopoverAnchor(null)}
            anchorEl={popoverAnchor}
            anchorOrigin={{
              vertical: 'center',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'center',
              horizontal: 'left'
            }}
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
          <Passcode disabled size='small' value={pin} />
        </>
      )}

      <IconButton size='small' onClick={onCancel}>
        <CancelIcon />
      </IconButton>
    </Box>
  );
};
