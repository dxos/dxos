//
// Copyright 2021 DXOS.org
//

import React from 'react';

import {
  Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

export interface AlertDialogProps {
  open: boolean
  title: string
  content: string
  onClose: (ok: boolean) => void
}

// TODO(burdon): Adapt to make more general and move to react-components.
export const AlertDialog = ({
  open,
  onClose,
  title,
  content
}: AlertDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
    >
      <DialogTitle id='alert-dialog-title'>
        {title}
      </DialogTitle>
      <DialogContent>
        <Alert severity='error'>{content}</Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Disagree</Button>
        <Button onClick={() => onClose(true)} autoFocus>Agree</Button>
      </DialogActions>
    </Dialog>
  );
};
