//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText, TextField } from '@mui/material';

export interface ImportIpfsDialogProps {
  open: boolean;
  onImport: (file: string) => void;
  onClose: () => void;
}

export const ImportIpfsDialog = ({ open, onImport, onClose }: ImportIpfsDialogProps) => {
  const [cid, setCid] = useState('');
  const handleImport = () => {
    onImport(cid);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Import IPFS Resource</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 4 }}>Enter or paste the resource CID.</DialogContentText>
        <TextField
          autoFocus
          variant='standard'
          label='IPFS CID'
          fullWidth
          autoComplete='off'
          spellCheck={false}
          value={cid}
          onChange={(event) => setCid(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={cid.length === 0} onClick={handleImport} variant='contained'>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};
