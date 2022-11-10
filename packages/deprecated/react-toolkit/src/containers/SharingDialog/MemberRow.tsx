//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Clear as CancelIcon } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';

import { PartyMember } from '@dxos/client';
import { MemberAvatar } from '@dxos/react-components';

export interface MemberRowProps {
  member: PartyMember;
  onRemove?: () => void;
}

/**
 * Party member row.
 */
export const MemberRow = ({ member, onRemove }: MemberRowProps) => (
  <Box
    sx={{
      display: 'flex',
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 40
    }}
  >
    <MemberAvatar key={member.identityKey.toString()} member={member} />

    <Typography sx={{ flex: 1, marginLeft: 2, marginRight: 2, whiteSpace: 'nowrap' }}>
      {member.profile?.displayName}
    </Typography>

    {/* TODO(burdon): Role (Read-only, Editor, Admin). */}
    {onRemove && (
      <IconButton size='small' onClick={onRemove}>
        <CancelIcon />
      </IconButton>
    )}
  </Box>
);
