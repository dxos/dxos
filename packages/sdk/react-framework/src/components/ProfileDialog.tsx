//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Toolbar,
  Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { LockOutlined as LockOutlinedIcon } from '@material-ui/icons';

const useStyles = makeStyles(theme => ({
  avatar: {
    backgroundColor: theme.palette.secondary.main,
    marginRight: theme.spacing(2)
  }
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
  const classes = useStyles();
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
        <Toolbar variant="dense" disableGutters>
          <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Create Profile
          </Typography>
        </Toolbar>
      </DialogTitle>
      <DialogContent>
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
      </DialogContent>
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
