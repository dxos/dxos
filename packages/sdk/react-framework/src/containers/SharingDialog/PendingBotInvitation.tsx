//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Clear as CancelIcon } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';

export interface PendingBotInvitationProps {
  onCancel: () => void
}

/**
 * Displays the bot invitation selector and status.
 */
export const PendingBotInvitation = ({
  onCancel
}: PendingBotInvitationProps) => {
  return (
    <Box sx={{
      display: 'flex',
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <IconButton size='small' onClick={onCancel}>
        <CancelIcon />
      </IconButton>
    </Box>
  );
};
