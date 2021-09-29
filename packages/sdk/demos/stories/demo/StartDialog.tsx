//
// Copyright 2020 DXOS.org
//

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
import React, { useState } from 'react';

interface HomeProps {
  onCreate: () => void,
  onJoin: (invitationCode: string) => void
}

/**
 * Home page.
 */
const StartDialog = ({ onCreate, onJoin }: HomeProps) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  return (
    <Dialog open={true} fullWidth maxWidth='sm'>
      <DialogTitle>Demo</DialogTitle>
      <DialogContent>
        <TextField
          id="start-dialog-invitation-input"
          fullWidth
          value={invitationCode}
          onChange={event => setInvitationCode(event.target.value)}
          variant='outlined'
          label='Invitation code'
          spellCheck={false}
        />

        <div style={{ height: 8, marginTop: 16 }}>
          {inProgress && <LinearProgress />}
        </div>

        {error && <Typography>{String(error.stack)}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button
          color='secondary'
          variant='contained'
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin(invitationCode);
            } catch (error) {
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

export default StartDialog;
