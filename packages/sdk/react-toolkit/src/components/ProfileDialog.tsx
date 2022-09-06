//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';

export interface ProfileDialogProps {
  open: boolean
  onCreate: ({ username }: { username: string }) => void
  onCancel?: () => void
  onJoinHalo?: () => void
}

/**
 * @deprecated Replace with RegistrationDialog.
 */
export const ProfileDialog = ({ open, onCreate, onCancel, onJoinHalo }: ProfileDialogProps) => {
  const [username, setUsername] = useState('');

  const handleUpdate = () => {
    onCreate({ username });
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Dialog
      open={open}
      title='Create Profile'
      content={(
        <Box sx={{ paddingTop: 1 }}>
          <TextField
            autoFocus
            fullWidth
            required
            value={username}
            onChange={event => setUsername(event.target.value)}
            onKeyPress={handleKey('Enter', handleUpdate)}
            label='Username'
            variant='outlined'
            spellCheck={false}
          />
        </Box>
      )}
      actions={(
        <>
          {onCancel && (
            <Button
              onClick={handleCancel}
              color='secondary'
            >
              Cancel
            </Button>
          )}
          {onJoinHalo && (
            <Button
              onClick={onJoinHalo}
              color='secondary'
            >
              Join HALO
            </Button>
          )}
          <Button
            color='primary'
            disabled={!username}
            onClick={handleUpdate}
          >
            Create
          </Button>
        </>
      )}
    />
  );
};
