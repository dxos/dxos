//
// Copyright 2020 DXOS.org
//

import { Box, Button, TextField } from '@mui/material';
import React, { useState } from 'react';

import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';

export interface ProfileDialogProps {
  open: boolean;
  onCreate: ({ username }: { username: string }) => void;
  onCancel?: () => void;
}

// TODO(burdon): Replace with RegistrationDialog.
export const ProfileDialog = ({ open, onCreate, onCancel }: ProfileDialogProps) => {
  const [username, setUsername] = useState('');

  const handleUpdate = () => {
    onCreate({ username });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // TODO(burdon): Use New Dialog.
  return (
    <Dialog
      open={open}
      title='Create Profile'
      content={() => (
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
      actions={() => (
        <>
          <Button
            onClick={handleCancel}
            color='secondary'
          >
            Cancel
          </Button>
          <Button
            color='primary'
            disabled={!username}
            onClick={handleUpdate}
          >
            Done
          </Button>
        </>
      )}
    />
  );
};
