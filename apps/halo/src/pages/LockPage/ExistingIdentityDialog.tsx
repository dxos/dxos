//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';

import {
  Redeem as InviteIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { Box, Button, Paper, Typography, styled, TextField } from '@mui/material';

import { Dialog, DialogProps } from '@dxos/react-components';

export interface ExistingIdentityDialogProps {
  open: DialogProps['open']
  onClose: DialogProps['onClose']
  onInvite: () => void
  onRecover: (seedphrase: string) => Promise<void>
}

type Stage = 'pick' | 'seedphrase' | 'invite'

const Option = styled(Paper)({
  'display': 'flex',
  'flexDirection': 'column',
  'justifyContent': 'center',
  'alignItems': 'center',
  'textAlign': 'center',
  'width': 260,
  'height': 200,
  'margin': 16,
  '& .MuiSvgIcon-root': {
    fontSize: 32
  }
});

const isSeedPhraseValid = (value: string) => value.trim().toLowerCase().split(/\s+/g).length === 12;

export const ExistingIdentityDialog = ({
  open,
  onClose,
  onRecover,
  // TODO(wittjosiah): Remove.
  onInvite
}: ExistingIdentityDialogProps) => {
  const [stage, setStage] = useState<Stage>('pick');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>();
  const [seedphrase, setSeedphrase] = useState('');

  const handleRecover = async () => {
    const restoreSeedPhrase = seedphrase.trim().toLowerCase();
    if (!isSeedPhraseValid(restoreSeedPhrase)) {
      setError('Invalid seed phrase.');
    } else {
      setProcessing(true);
      try {
        await onRecover(restoreSeedPhrase);
      } catch (err: any) {
        // TODO(burdon): Detect user-facing message or display generic.
        setError(err.message);
      }
      setProcessing(false);
    }
  };

  const getStage = useCallback((stage: Stage) => {
    switch (stage) {
      case 'seedphrase': {
        return {
          title: 'Restoring your profile',
          content: (
            <Box sx={{ marginTop: 1 }}>
              <TextField
                autoFocus
                fullWidth
                error={Boolean(error)}
                helperText={error}
                placeholder='Enter your seed phrase.'
                onChange={event => setSeedphrase(event.target.value)}
              />
            </Box>
          ),
          actions: (
            <>
              <Button color='primary' onClick={() => setStage('pick')}>
                Back
              </Button>
              <Button
                color='primary'
                variant='contained'
                onClick={handleRecover}
              >
                Restore
              </Button>
            </>
          )
        };
      }

      default: {
        return {
          title: 'Select identity method',
          content: (
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-around',
              flexWrap: 'wrap'
            }}>
              <Box>
                <Option variant='outlined'>
                  <InviteIcon />
                  <Typography sx={{ padding: 3 }}>
                    Use a device invitation to join your identity.<br />&nbsp;
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => onInvite()}>
                    Invitation
                  </Button>
                </Option>
              </Box>
              <Box>
                <Option variant='outlined'>
                  <RestoreIcon />
                  <Typography sx={{ padding: 3 }}>
                    Enter your seed phrase<br />to recover your identity.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage('seedphrase')}>
                    Recover Identity
                  </Button>
                </Option>
              </Box>
            </Box>
          )
        };
      }
    }
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      processing={processing}
      {...getStage(stage)}
    />
  );
};
