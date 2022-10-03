//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Avatar, Box, Button, Chip, Grid, TextField, Typography, useTheme } from '@mui/material';

import { generateSeedPhrase } from '@dxos/client';
import { Dialog, DialogProps } from '@dxos/react-components';

export interface NewIdentityDialogProps {
  open: DialogProps['open']
  onClose: DialogProps['onClose']
  onComplete: (seedPhrase: string, username: string) => void
}

type Stage = 'username' | 'seedphrase'

const SEED_PHRASE_FILE = 'dxos-recovery-seedphrase.txt';

// TODO(burdon): Factor out.
export const createDownloadLink = (filename: string, text: string): HTMLAnchorElement => {
  const file = new Blob([text], { type: 'text/plain' });
  const element = document.createElement('a');
  element.href = URL.createObjectURL(file);
  element.download = filename;
  return element;
};

// TODO(burdon): Factor out.
const SeedPhrasePanel = ({ value }: { value: string }) => {
  const theme = useTheme();
  const words = value.split(' ');

  return (
    <Grid container spacing={0}>
      {words.map((word, i) => (
        <Grid
          item
          key={i}
          xs={6}
          sm={3}
          sx={{
            root: {
              maxWidth: '50%'
            }
          }}
        >
          <Chip
            key={i}
            sx={{
              'width': 128,
              'justifyContent': 'inherit',
              'margin': '4px',
              '.MuiChip-icon': {
                color: theme.palette.background.paper
              },
              '.MuiChip-label': {
                paddingLeft: '16px'
              }
            }}
            icon={(
              <Avatar
                sx={{
                  margin: 0,
                  fontSize: 11,
                  height: 24,
                  width: 24,
                  marginLeft: 5,
                  backgroundColor: theme.palette.primary.dark
                }}
              >
                {i + 1}
              </Avatar>
            )}
            label={word}
            data-testid='chip'
          />
        </Grid>
      ))}
    </Grid>
  );
};

export const NewIdentityDialog = ({
  open,
  onClose,
  onComplete
}: NewIdentityDialogProps) => {
  const [stage, setStage] = useState<Stage>('username');
  const [username, setUsername] = useState('');
  const [seedPhrase] = useState(generateSeedPhrase());

  const handleDownloadSeedPhrase = (seedPhrase: string) => {
    const text = seedPhrase.split(' ').map((word, i) => `[${String(i + 1).padStart(2, '0')}] = ${word}`).join('\n');
    const element = createDownloadLink(SEED_PHRASE_FILE, text);
    element.click();
  };

  const getStage = useCallback((stage: Stage) => {
    switch (stage) {
      case 'seedphrase': {
        return {
          title: 'Seed phrase',
          content: (
            <>
              <Typography sx={{ marginBottom: 1 }}>
                Your recovery seed phrase consists of the twelve words below.
              </Typography>
              <Typography sx={{ marginBottom: 2 }}>
                You will need to enter the seed phrase if you ever need to recover your profile.
              </Typography>
              <SeedPhrasePanel value={seedPhrase} />
              <Typography sx={{ marginTop: 2 }}>
                <b>NEVER</b> share your recovery seed phrase with anyone.
              </Typography>
            </>
          ),
          actions: (
            <Box sx={{ display: 'flex', flex: 1 }}>
              <Button onClick={() => handleDownloadSeedPhrase(seedPhrase)}>Download</Button>
              <Box sx={{ flex: 1 }} />
              <Button
                color='primary'
                onClick={() => setStage('username')}
              >
                Back
              </Button>
              <Button
                variant='contained'
                color='primary'
                onClick={() => onComplete(seedPhrase, username)}
              >
                Complete
              </Button>
            </Box>
          )
        };
      }
      default: {
        return {
          title: 'Create your identity',
          content: (
            <Box sx={{ marginTop: 1 }}>
              <TextField
                autoFocus
                fullWidth
                spellCheck={false}
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder='Enter a username.'
              />
            </Box>
          ),
          actions: (
            <Button
              variant='contained'
              onClick={() => setStage('seedphrase')}
            >
              Next
            </Button>
          )
        };
      }
    }

  }, [username, seedPhrase]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      {...getStage(stage)}
    />
  );
};
