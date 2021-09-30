//
// Copyright 2020 DXOS.org
//

import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  styled,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import React, { useState } from 'react';

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: theme.palette.secondary.main,
  marginRight: theme.spacing(2)
}));

const Content = styled(DialogContent)(({ theme }) => ({
  paddingTop: `${theme.spacing(1)} !important`
}));

interface IRegister{
  username: string;
}

export interface IProfileDialog {
  open: boolean;
  onCreate: ({ username }: IRegister)=>void;
  onCancel?: () => void;
}

const ProfileDialog = ({ open, onCreate, onCancel } :IProfileDialog) => {
  const [username, setUsername] = useState('');

  const handleUpdate = () => {
    onCreate({ username });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth="xs">
      <DialogTitle>
        <Toolbar variant='dense' disableGutters>
          <StyledAvatar>
            <LockOutlinedIcon />
          </StyledAvatar>
          <Typography component="h1" variant="h5">
            Create Profile
          </Typography>
        </Toolbar>
      </DialogTitle>
      <Content>
        <TextField
          autoFocus
          fullWidth
          required
          value={username}
          onChange={event => setUsername(event.target.value)}
          onKeyPress={event => (event.key === 'Enter') && handleUpdate()}
          label="Username"
          variant="outlined"
          spellCheck={false}
        />
      </Content>
      <DialogActions>
        <Button
          onClick={handleCancel}
          color="secondary"
        >
          Cancel
        </Button>
        <Button
          color="primary"
          disabled={!username}
          onClick={handleUpdate}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
