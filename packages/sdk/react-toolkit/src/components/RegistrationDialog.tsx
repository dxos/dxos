//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useMemo, useState } from 'react';

import {
  AddCircleOutline as CreateIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  TextField,
  Typography,
  styled,
  useTheme
} from '@mui/material';

import { generateSeedPhrase } from '@dxos/client';
import { Dialog } from '@dxos/react-components';

import { pickUnique, isMobile, ordinal, createDownloadLink } from '../helpers';

enum Stage {
  START,
  RESTORE,
  ENTER_USERNAME,
  SHOW_SEED_PHRASE,
  CHECK_SEED_PHRASE
}

const numSeedWordTests = 4;

const useSeedWords = (seedPhrase: string, n: number): [string[], number[]] => {
  const words = seedPhrase.split(' ');
  const indexes = pickUnique<number>([...new Array(words.length)].map((_, i) => i), n);
  return [words, indexes];
};

const isSeedPhraseValid = (value: string) => value.trim().toLowerCase().split(/\s+/g).length === 12;

const seedPhraseFile = 'dxos-recovery-seedphrase.txt';

export interface RegistrationDialogProps {
  open: boolean
  modal?: boolean
  debug?: boolean
  onRestore: (seedPhrase: string) => void // TODO(burdon): Optional (hide option).
  onComplete: (seedPhrase: string, username: string) => void
  onJoinHalo?: () => void
}

/**
 * Registration and recovery dialog.
 */
export const RegistrationDialog = ({
  open = true,
  modal = true,
  debug = false,
  onRestore,
  onComplete,
  onJoinHalo
}: RegistrationDialogProps) => {
  const [stage, setCurrentStage] = useState(Stage.START);
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [seedPhrase] = useState(generateSeedPhrase());
  const [username, setUsername] = useState('');
  const usernameRef = useRef<HTMLInputElement>();
  const seedphraseRef = useRef<HTMLInputElement>();
  const seedRefs = [...new Array(numSeedWordTests)].map(() => useRef<HTMLInputElement>());
  const [seedWords, seedWordTestIndexes] = useMemo(() => useSeedWords(seedPhrase, numSeedWordTests), [seedPhrase]);

  const setStage = (stage: Stage) => {
    setError(undefined);
    setProcessing(false);
    setCurrentStage(stage);
  };

  useEffect(() => {
    if (open) {
      setStage(Stage.START);
    }
  }, [open]);

  const handleDownloadSeedPhrase = (seedPhrase: string) => {
    const text = seedPhrase.split(' ').map((word, i) => `[${String(i + 1).padStart(2, '0')}] = ${word}`).join('\n');
    const element = createDownloadLink(seedPhraseFile, text);
    element.click();
  };

  const handleNext = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> => {
    setError(undefined);
    setProcessing(false);

    switch (stage) {
      case Stage.ENTER_USERNAME: {
        const value = usernameRef.current!.value.trim();
        if (value.length > 0) {
          setUsername(value);
          setStage(Stage.SHOW_SEED_PHRASE);
        }
        break;
      }

      case Stage.SHOW_SEED_PHRASE: {
        setStage(Stage.CHECK_SEED_PHRASE);
        break;
      }

      case Stage.CHECK_SEED_PHRASE: {
        const testWords = seedRefs.map(seedRef => seedRef.current!.value);
        // Find first word that doesn't match.
        const match = undefined === testWords.find((word, i) => word !== seedWords[seedWordTestIndexes[i]] ? true : undefined);

        const skipMatch = (debug || event.shiftKey || !!isMobile);
        if (match || skipMatch) {
          setProcessing(true);
          await onComplete(seedPhrase, username);
          setProcessing(false);
        } else {
          setStage(Stage.SHOW_SEED_PHRASE);
        }
        break;
      }

      case Stage.RESTORE: {
        const restoreSeedPhrase = seedphraseRef.current!.value.trim().toLowerCase();
        if (!isSeedPhraseValid(restoreSeedPhrase)) {
          setError('Invalid seed phrase.');
        } else {
          setProcessing(true);
          try {
            await onRestore(restoreSeedPhrase);
          } catch (err: any) {
            // TODO(burdon): Detect user-facing message or display generic.
            setError(err.message);
          }
          setProcessing(false);
        }
        break;
      }

      default: {
        setStage(Stage.ENTER_USERNAME);
      }
    }
  };

  const handleKeyDown = async (event: React.SyntheticEvent) => {
    if ((event as React.KeyboardEvent).key === 'Enter') {
      await handleNext(event as React.MouseEvent<HTMLButtonElement, MouseEvent>);
    }
  };

  // TODO(burdon): Factor out.
  const SeedPhrasePanel = ({ value }: { value: string }) => {
    const theme = useTheme();
    const words = value.split(' ');

    return (
      <Grid container spacing={0}>
        {words.map((word, i) => (
          <Grid item key={i} xs={3}>
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

  const getStage = (stage: Stage) => {
    const Option = styled(Paper)({
      'display': 'flex',
      'flexDirection': 'column',
      'justifyContent': 'center',
      'alignItems': 'center',
      'textAlign': 'center',
      'width': 260,
      'height': 220,
      'margin': 16,
      '& .MuiSvgIcon-root': {
        fontSize: 32
      }
    });

    switch (stage) {
      case Stage.START: {
        return {
          title: 'User profile',
          content: (
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <Box>
                <Option variant='outlined'>
                  <CreateIcon />
                  <Typography sx={{ padding: 3 }}>
                    Create a new profile.<br />&nbsp;
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>
                    Create Profile
                  </Button>
                </Option>
              </Box>
              <Box>
                <Option variant='outlined'>
                  <RestoreIcon />
                  <Typography sx={{ padding: 3 }}>
                    Enter your seed phrase<br />to recover your profile.
                  </Typography>
                  <Button variant='contained' color='primary' onClick={() => setStage(Stage.RESTORE)}>
                    Recover Profile
                  </Button>
                </Option>
              </Box>
            </Box>
          ),
          actions: onJoinHalo ? (
            <Box sx={{ display: 'flex', flex: 1 }}>
              <Box sx={{ flex: 1 }} />
              <Button color='primary' onClick={onJoinHalo}>
                Join HALO invitation
              </Button>
            </Box>
          ) : undefined
        };
      }

      case Stage.RESTORE: {
        return {
          title: 'Restoring your profile',
          content: (
            <Box sx={{ marginTop: 1 }}>
              <TextField
                autoFocus
                fullWidth
                inputRef={seedphraseRef}
                placeholder='Enter your seed phrase.'
                onKeyDown={handleKeyDown}
              />
            </Box>
          ),
          actions: (
            <Box sx={{ display: 'flex', flex: 1 }}>
              {/* TODO(burdon): Import. */}
              <Button disabled>
                Import Keyring
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button color='primary' onClick={() => setStage(Stage.START)}>
                Back
              </Button>
              <Button
                color='primary'
                variant='contained'
                onClick={handleNext}
              >
                Restore
              </Button>
            </Box>
          )
        };
      }

      case Stage.ENTER_USERNAME: {
        return {
          title: 'Create your profile',
          content: (
            <Box sx={{ marginTop: 1 }}>
              <TextField
                autoFocus
                fullWidth
                spellCheck={false}
                inputRef={usernameRef}
                onKeyDown={handleKeyDown}
                placeholder='Enter a username.'
              />
            </Box>
          ),
          actions: (
            <>
              <Button color='primary' onClick={() => setStage(Stage.START)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
            </>
          )
        };
      }

      case Stage.SHOW_SEED_PHRASE: {
        return {
          title: 'Seed phrase',
          content: (
            <>
              <Typography sx={{ marginBottom: 1 }}>
                Your recovery seed phrase consists of the twelve words below.
              </Typography>
              <Typography sx={{ marginBottom: 3 }}>
                You will need to enter the seed phrase if you ever need to recover your profile.
              </Typography>
              <SeedPhrasePanel value={seedPhrase} />
              <Typography sx={{ marginTop: 3 }}>
                <b>NEVER</b> share your recovery seed phrase with anyone.
              </Typography>
            </>
          ),
          actions: (
            <Box sx={{ display: 'flex', flex: 1 }}>
              <Button onClick={() => handleDownloadSeedPhrase(seedPhrase)}>Download</Button>
              <Box sx={{ flex: 1 }} />
              <Button color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Next</Button>
            </Box>
          )
        };
      }

      case Stage.CHECK_SEED_PHRASE: {
        return {
          title: 'Verify the seed phrase',
          content: (
            <>
              <Typography sx={{ marginBottom: 2 }}>
                You will need to enter the entire seed phrase if you ever need to recover your profile.
              </Typography>
              <Typography sx={{ marginBottom: 3 }}>
                Confirm the following words from your seed phrase.
              </Typography>
              <Box sx={{}}>
                {seedRefs.map((seedRef, i) => (
                  <TextField
                    key={i}
                    autoFocus={i === 0}
                    inputRef={seedRef}
                    placeholder={`${ordinal(seedWordTestIndexes[i] + 1)} word`}
                    onKeyDown={i === seedRefs.length - 1 ? handleKeyDown : undefined}
                    sx={{ width: 120, marginRight: 1 }}
                  />
                ))}
              </Box>
            </>
          ),
          actions: (
            <>
              <Button color='primary' onClick={() => setStage(Stage.ENTER_USERNAME)}>Back</Button>
              <Button variant='contained' color='primary' onClick={handleNext}>Finish</Button>
            </>
          )
        };
      }

      default: {
        return null;
      }
    }
  };

  const props = getStage(stage);
  return (
    <Dialog
      open={open}
      modal={modal}
      maxWidth='sm'
      error={error}
      processing={processing}
      {...props}
    />
  );
};
