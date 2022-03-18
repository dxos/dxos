//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';

interface InvitationDialogProps {
  open: boolean
  title?: string
  onCreate: () => void,
  onJoin: (invitationCode: string) => void
  onImportParty: (partyFile: File) => void
}

/**
 * Home page.
 */
export const InvitationDialog = ({
  open,
  title = 'Demo',
  onCreate,
  onJoin,
  onImportParty
}: InvitationDialogProps) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const handleImportParty = async (files: FileList | null) => {
    if (!files || !onImportParty) {
      return;
    }

    const partyFileToImport = files[0];

    setInProgress(true);
    setError(undefined);
    try {
      await onImportParty(partyFileToImport);
    } catch (error: any) {
      console.error(error);
      setError(error);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <Dialog open={open} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ '&.MuiDialogContent-root': { paddingTop: 1 } }}>
        <TextField
          fullWidth
          value={invitationCode}
          onChange={event => setInvitationCode(event.target.value)}
          variant='outlined'
          label='Invitation code'
          autoComplete='off'
          spellCheck={false}
          inputProps={{
            'data-id': 'test-input-join'
          }}
        />

        <div style={{ height: 8, marginTop: 16 }}>
          {inProgress && <LinearProgress />}
        </div>

        {error && <Typography>{String(error.stack)}</Typography>}
      </DialogContent>
      <DialogActions>
        <>
          <input
            style={{ display: 'none' }}
            id='raised-button-file'
            type='file'
            onChange={e => handleImportParty(e.currentTarget.files)}
          />
          <label htmlFor='raised-button-file'>
            <Button
              data-id='test-button-import'
              color='primary'
              variant='outlined'
              component='span'
              disabled={inProgress}
            >
              Import Party
            </Button>
          </label>
        </>
        <Button
          data-id='test-button-join'
          color='secondary'
          variant='contained'
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin(invitationCode);
            } catch (error: any) {
              console.error(error);
              setError(error);
            } finally {
              setInProgress(false);
            }
          }}
          disabled={!invitationCode || inProgress}
        >
          Join Party
        </Button>
        <Button
          data-id='test-button-create'
          color='primary'
          variant='contained'
          onClick={() => {
            setInProgress(true);
            onCreate();
          }}
          disabled={inProgress}
        >
          Create Party
        </Button>
      </DialogActions>
    </Dialog>
  );
};
