//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';

export interface ProfileDialogProps {
  open: boolean;
  onCreate: ({ displayName }: { displayName: string }) => void;
  onCancel?: () => void;
  onJoinHalo?: () => void;
}

/**
 * @deprecated Replace with RegistrationDialog.
 */
export const ProfileDialog = ({ open, onCreate, onCancel, onJoinHalo }: ProfileDialogProps) => {
  const [displayName, setDisplayName] = useState('');

  const handleUpdate = () => {
    onCreate({ displayName });
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Dialog
      open={open}
      title='Create Profile'
      content={
        <Box sx={{ paddingTop: 1 }}>
          <TextField
            autoFocus
            fullWidth
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            onKeyPress={handleKey('Enter', handleUpdate)}
            label='Display Name'
            variant='outlined'
            spellCheck={false}
          />
        </Box>
      }
      actions={
        <>
          {onCancel && (
            <Button onClick={handleCancel} color='secondary'>
              Cancel
            </Button>
          )}
          {onJoinHalo && (
            <Button onClick={onJoinHalo} color='secondary'>
              Join HALO
            </Button>
          )}
          <Button color='primary' disabled={!displayName} onClick={handleUpdate}>
            Create
          </Button>
        </>
      }
    />
  );
};
